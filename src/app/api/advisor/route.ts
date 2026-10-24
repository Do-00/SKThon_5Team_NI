import { NextResponse } from "next/server";
import {
  eligibleMeasures,
  hintedMeasures,
  minimalCombos,
  rankByQuestion,
  subsidyCheck,
  type AdvisorAction,
  type AdvisorCitation,
  type AdvisorRequest,
  type AdvisorResponse,
  type MeasureCode,
} from "@/src/lib/law-advisor";
import { PROGRAM_KIND, expandQuery, lawCorpusGeneratedAt, searchLaw, type LawHit } from "@/src/lib/law-search";

/**
 * 검색형 AI 상담 — 법령·공고에서 근거를 찾고(검색), Gemini 가 그 근거만 인용해 답한다(생성).
 *
 * 1. 질문을 법령 어휘로 넓혀 조문을 BM25 로 찾는다 (`law-search.ts`).
 * 2. 이 건물에 의미 있는 조치만 남긴다 (지역난방이면 보일러 제외 등).
 * 3. Gemini 에게 "아래 근거 id 만 인용하라" 고 시키고, 돌아온 인용이 실제 근거 목록에 있는지 검사한다.
 * 4. 절감률 누적·이자지원 요건은 서버가 계산한다 — AI 가 숫자를 만들지 않게.
 * 키가 없거나 호출·검증이 실패하면 같은 근거로 규칙 기반 답을 돌려준다.
 */

// 무료 등급은 모델마다 하루 한도가 따로다. 한 모델이 429·404·503 이면 다음 모델로 넘어간다.
// .env.local 의 GEMINI_MODEL 에 쉼표로 여러 개를 적으면 그 순서를 쓴다.
const GEMINI_MODELS = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.7-flash,gemini-3.5-flash,gemini-3.6-flash,gemini-3-flash-preview")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const geminiEndpoint = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const GEMINI_TIMEOUT_MS = 30_000;
/** 과부하(503)·호출 제한(429)은 잠깐 뒤 다시 하면 대개 풀린다 — 이 간격으로 두 번까지 다시 시도한다. */
const RETRY_DELAYS_MS = [800, 2000];
const RETRYABLE_STATUS = new Set([429, 500, 503]);

/**
 * 같은 건물·같은 질문이면 Gemini 를 다시 부르지 않는다. 무료 등급 할당량(429)을 아끼고,
 * 시연 중 같은 예시 질문을 눌러도 즉시 같은 답이 나오게 하려고. Gemini 답만 저장한다.
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 200;
const answerCache = new Map<string, { at: number; body: AdvisorResponse }>();

function cacheKey(req: AdvisorRequest): string {
  return JSON.stringify([req.question.replace(/\s+/g, " "), req.audience, req.building]);
}

function readCache(key: string): AdvisorResponse | null {
  const hit = answerCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    answerCache.delete(key);
    return null;
  }
  return hit.body;
}

function writeCache(key: string, body: AdvisorResponse) {
  if (answerCache.size >= CACHE_MAX) answerCache.delete(answerCache.keys().next().value as string);
  answerCache.set(key, { at: Date.now(), body });
}
const MAX_QUESTION_CHARS = 300;
const HIT_LIMIT = 8;

/** "서울특별시" 와 "서울" 을 같은 지역으로 본다 — 앞 두 글자만 비교. */
const sameRegion = (a: string, b: string) => a.slice(0, 2) === b.slice(0, 2);

/** 다른 시·도 전용 지원사업은 근거에서 뺀다. 건물 지역을 모르면 전국 사업만 남긴다. */
function keepForRegion(hit: LawHit, region: string | null | undefined): boolean {
  if (hit.kind !== PROGRAM_KIND) return true;
  const programRegion = hit.article.split(" ")[0];
  if (programRegion === "전국") return true;
  return Boolean(region) && sameRegion(programRegion, region as string);
}

const CAUTION =
  "법령·공고를 바탕으로 한 안내이며 법률 자문이 아닙니다. 실제 지원 여부와 개선률은 그린리모델링 창조센터의 진단으로 확정됩니다.";

/** 비교용 정규화: 공백·따옴표·괄호·가운뎃점 같은 부호를 지우고 소문자로. 글자 자체는 바꾸지 않는다. */
function normalizeForQuote(text: string): string {
  return text.normalize("NFKC").replace(/[\s"'“”‘’「」『』()（）\[\]<>《》,.·ㆍ、。:;…~\-–—]/g, "").toLowerCase();
}

const MIN_QUOTE_CHARS = 8;

/** AI 가 낸 인용 문장이 그 조문 원문에 실제로 들어 있는지. 짧은 문장은 우연히 맞을 수 있어 거른다. */
function quoteInSource(quote: string, sourceText: string): boolean {
  const q = normalizeForQuote(quote);
  return q.length >= MIN_QUOTE_CHARS && normalizeForQuote(sourceText).includes(q);
}

function toCitation(hit: LawHit, quote?: string): AdvisorCitation {
  const verified = typeof quote === "string" && quoteInSource(quote, hit.text);
  return {
    id: hit.id,
    source: hit.source,
    kind: hit.kind,
    article: hit.article,
    title: hit.title,
    url: hit.url,
    excerpt: hit.text.length > 160 ? `${hit.text.slice(0, 160)}…` : hit.text,
    ...(verified ? { quote: (quote as string).trim() } : {}),
    quoteVerified: verified,
  };
}

/** 건물 정보에서 검색에 도움이 되는 낱말 — 용도에 따라 다른 조문이 걸리게. */
function contextTerms(req: AdvisorRequest): string[] {
  const b = req.building;
  const terms = ["그린리모델링", "에너지 성능"];
  if (/공동주택|아파트|주택/.test(b.useType)) terms.push("주거 공동주택");
  else terms.push("비주거 건축물");
  if (b.completionYear && b.completionYear < 2001) terms.push("기존 건축물 에너지성능 개선");
  return terms;
}

function gradeSentence(req: AdvisorRequest): string {
  const b = req.building;
  switch (b.gradeStatus) {
    case "certified":
      return `공식 인증 등급 ${b.gradeLabel}`;
    case "estimated":
      return `추정 등급 ${b.gradeLabel} (공식 등급 아님)`;
    case "range":
      return `추정 범위 ${b.gradeLabel} (하나로 단정할 수 없음)`;
    case "refused":
      return "비교할 인증 사례가 부족해 등급을 추정하지 않음";
    default:
      return "등급 정보 없음";
  }
}

function buildPrompt(req: AdvisorRequest, hits: LawHit[], measures: ReturnType<typeof eligibleMeasures>): string {
  const b = req.building;
  return [
    "당신은 건축물 에너지 성능 개선(그린리모델링) 상담가입니다. 아래 규칙을 반드시 지키세요.",
    "1. [근거 목록]에 있는 내용만 근거로 삼고, 법령이나 공고를 언급하면 그 id 를 citationIds 에 넣으세요.",
    "2. [근거 목록]에 없는 조문 번호, 금액, 비율은 절대 쓰지 마세요. 근거가 부족하면 '확인된 근거가 없다'고 말하세요.",
    "3. 조치는 [가능한 조치]의 code 에서만 고르세요(최대 3개). 절감률은 표의 숫자만 쓰세요.",
    "   질문이 [가능한 조치]와 관련 없으면(예: 태양광, 법의 정의) actions 는 빈 배열로 두고 근거로만 답하세요.",
    "   [근거 목록]에 지원사업이 있으면 사업 이름과 신청 방법을 함께 안내하세요.",
    "4. 등급이 추정·범위·보류이면 단정하지 마세요.",
    "5. 고령자도 이해할 수 있게 쉬운 존댓말로 3~5문장. 전문용어는 괄호로 짧게 풀어 주세요.",
    "   조치는 이름으로만 말하고 code(WIN, WAL 같은 영문 약어)는 답변 문장에 쓰지 마세요.",
    "7. citationIds 에 넣은 근거마다 quotes 에 {id, quote} 를 하나씩 넣으세요. quote 는 그 근거의 [내용]에서 답변에 실제로 쓴 부분을 한 문장 그대로(한 글자도 바꾸지 말고) 복사한 것입니다. 요약하거나 말을 바꾸면 안 됩니다.",
    "6. 이자지원 요건 충족 여부는 서버가 따로 계산하니, 답변에서 퍼센트를 새로 계산하지 마세요.",
    "",
    "[건물]",
    `- 이름: ${b.name}`,
    `- 용도: ${b.useType}`,
    `- 준공연도: ${b.completionYear ?? "알 수 없음"} / 적용 단열기준: ${b.insulationEra ?? "알 수 없음"}`,
    `- 난방 방식: ${b.heatingType ?? "알 수 없음"}`,
    `- 등급: ${gradeSentence(req)}`,
    `- 질문한 사람: ${req.audience === "tenant" ? "임차인(세입자)" : "소유주"}`,
    "",
    "[가능한 조치] code | 이름 | 1차에너지 절감률 | 공사 규모(1~3) | 제약",
    ...measures.map((m) => `- ${m.code} | ${m.title} | ${m.reductionPct}% | ${m.costLevel} | ${m.needs ?? "없음"}`),
    "",
    "[근거 목록] id | 문서 | 조문 | 내용",
    ...hits.map((h) => `- ${h.id} | ${h.source} (${h.kind}) | ${h.article}${h.title ? `(${h.title})` : ""} | ${h.text}`),
    "",
    `[질문] ${req.question}`,
  ].join("\n");
}

function responseSchema(codes: MeasureCode[], ids: string[]) {
  return {
    type: "OBJECT",
    properties: {
      answer: { type: "STRING", description: "질문에 대한 답, 쉬운 존댓말 3~5문장" },
      actions: {
        type: "ARRAY",
        maxItems: 3,
        items: {
          type: "OBJECT",
          properties: {
            code: { type: "STRING", enum: codes },
            reason: { type: "STRING", description: "이 건물에 이 조치를 권하는 이유, 한 문장" },
            citationIds: { type: "ARRAY", items: { type: "STRING", enum: ids } },
          },
          required: ["code", "reason", "citationIds"],
        },
      },
      citationIds: { type: "ARRAY", items: { type: "STRING", enum: ids } },
      quotes: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING", enum: ids },
            quote: { type: "STRING", description: "근거 내용에서 한 글자도 바꾸지 않고 복사한 한 문장" },
          },
          required: ["id", "quote"],
        },
      },
    },
    required: ["answer", "actions", "citationIds", "quotes"],
  };
}

interface GeminiAdvice {
  answer: string;
  actions: { code: string; reason: string; citationIds: string[] }[];
  citationIds: string[];
  quotes?: { id: string; quote: string }[];
}

/** Gemini 답을 받아들일지 검사한다. 근거 목록 밖의 인용·조치는 버리고, 근거가 하나도 없으면 거절한다. */
function acceptAdvice(raw: unknown, hitIds: Set<string>, measures: ReturnType<typeof eligibleMeasures>) {
  const advice = raw as Partial<GeminiAdvice>;
  if (typeof advice?.answer !== "string" || advice.answer.trim().length < 10) return { reason: "답변 없음" } as const;

  const allowed = new Map(measures.map((m) => [m.code as string, m]));
  const keepIds = (list: unknown) =>
    Array.isArray(list) ? [...new Set(list.filter((id): id is string => typeof id === "string" && hitIds.has(id)))] : [];

  const actions: AdvisorAction[] = [];
  for (const a of Array.isArray(advice.actions) ? advice.actions : []) {
    const m = a && allowed.get(a.code);
    if (!m || actions.some((x) => x.code === m.code)) continue;
    actions.push({ ...m, reason: String(a.reason ?? "").trim(), citationIds: keepIds(a.citationIds) });
  }
  const citationIds = [...new Set([...keepIds(advice.citationIds), ...actions.flatMap((a) => a.citationIds)])];
  if (citationIds.length === 0) return { reason: "근거 인용 없음" } as const;
  const quotes: Record<string, string> = {};
  for (const q of Array.isArray(advice.quotes) ? advice.quotes : []) {
    if (q && typeof q.id === "string" && typeof q.quote === "string" && hitIds.has(q.id) && !quotes[q.id]) quotes[q.id] = q.quote;
  }
  return { answer: advice.answer.trim(), actions, citationIds, quotes } as const;
}

function fallbackAdvice(req: AdvisorRequest, hits: LawHit[], measures: ReturnType<typeof eligibleMeasures>) {
  const codes = measures.map((m) => m.code);
  const topIds = hits.slice(0, 3).map((h) => h.id);
  // 질문이 개선 조치를 가리키지 않으면(태양광, 법 정의 등) 조치를 억지로 채우지 않는다.
  if (hintedMeasures(req.question, codes).length === 0 && !/공사|개선|추천|무엇부터|뭐부터|어떤 조치/.test(req.question)) {
    const program = hits.find((h) => h.kind === PROGRAM_KIND);
    const lead = hits[0]
      ? `질문과 관련된 근거 ${Math.min(hits.length, 3)}건을 찾았어요. 가장 가까운 근거는 ${hits[0].kind === PROGRAM_KIND ? hits[0].source : `${hits[0].source} ${hits[0].article}`}입니다.`
      : "질문과 관련된 법령·지원사업 근거를 찾지 못했어요.";
    const programLine = program ? ` 관련 지원사업으로 「${program.source}」가 있어요.` : "";
    return {
      answer: `${lead}${programLine} 아래 근거 원문을 확인해 주세요.`.replace(/\s+/g, " "),
      actions: [] as AdvisorAction[],
      citationIds: topIds,
    };
  }
  const ranked = rankByQuestion(req.question, codes);
  const actions: AdvisorAction[] = ranked.slice(0, 3).map((code) => {
    const m = measures.find((x) => x.code === code)!;
    return {
      ...m,
      reason: `1차에너지소요량을 약 ${m.reductionPct}% 줄이는 조치입니다.${m.needs ? ` (${m.needs})` : ""}`,
      citationIds: [],
    };
  });
  const lead = hits[0]
    ? `관련 근거로 ${hits[0].source} ${hits[0].article}${hits[0].title ? `(${hits[0].title})` : ""}을 찾았습니다.`
    : "관련 법령 근거를 찾지 못했습니다.";
  return {
    answer: `${lead} 이 건물에서 먼저 검토할 만한 조치는 ${actions.map((a) => a.title).join(", ")}입니다. 아래 근거 원문과 지원 요건을 함께 확인해 주세요.`,
    actions,
    citationIds: topIds,
  };
}

/** 일시적 오류면 잠깐 쉬었다 다시 부른다. 마지막 응답(성공이든 실패든)을 돌려준다. */
async function fetchGemini(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS) });
    const delay = RETRY_DELAYS_MS[attempt];
    if (res.ok || !RETRYABLE_STATUS.has(res.status) || delay === undefined) return res;
    await res.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export async function POST(request: Request) {
  let req: AdvisorRequest;
  try {
    req = (await request.json()) as AdvisorRequest;
  } catch {
    return NextResponse.json({ message: "잘못된 요청" }, { status: 400 });
  }
  const question = String(req?.question ?? "").trim().slice(0, MAX_QUESTION_CHARS);
  if (!question || !req?.building) return NextResponse.json({ message: "질문과 건물 정보가 필요합니다" }, { status: 400 });
  req = { ...req, question, audience: req.audience === "tenant" ? "tenant" : "owner" };

  const key = cacheKey(req);
  const cachedBody = readCache(key);
  if (cachedBody) return NextResponse.json(cachedBody);

  const hits = searchLaw(expandQuery(question, contextTerms(req)), HIT_LIMIT * 2)
    .filter((hit) => keepForRegion(hit, req.building.region))
    .slice(0, HIT_LIMIT);
  const measures = eligibleMeasures(req.building, req.audience);
  const codes = measures.map((m) => m.code);
  const hitById = new Map(hits.map((h) => [h.id, h]));

  const finish = (
    advice: { answer: string; actions: AdvisorAction[]; citationIds: string[]; quotes?: Record<string, string> },
    source: AdvisorResponse["source"],
    fallbackReason?: string,
  ) => {
    const body: AdvisorResponse = {
      source,
      answer: advice.answer,
      actions: advice.actions,
      subsidy: subsidyCheck(advice.actions.map((a) => a.code)),
      minimalCombos: minimalCombos(measures),
      citations: advice.citationIds.map((id) => hitById.get(id)).filter((h): h is LawHit => Boolean(h)).map((h) => toCitation(h, advice.quotes?.[h.id])),
      caution: CAUTION,
      lawAsOf: lawCorpusGeneratedAt(),
      ...(fallbackReason ? { fallbackReason } : {}),
    };
    if (source === "gemini") writeCache(key, body);
    return NextResponse.json(body);
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || hits.length === 0) {
    return finish(fallbackAdvice(req, hits, measures), "fallback", !apiKey ? "GEMINI_API_KEY 없음" : "근거 없음");
  }

  try {
    const prompt = buildPrompt(req, hits, measures);
    const schema = responseSchema(codes, hits.map((h) => h.id));
    let res!: Response;
    for (const model of GEMINI_MODELS) {
      res = await fetchGemini(`${geminiEndpoint(model)}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            // 근거를 고르고 요약하는 일이라 깊게 생각할 필요가 없다 — 응답 속도를 우선한다.
            maxOutputTokens: 4096,
            thinkingConfig: { thinkingLevel: "low" },
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      });
      if (res.ok || ![429, 404, 503].includes(res.status)) break;
      console.warn(`[api/advisor] ${model} → ${res.status}, 다음 모델로 넘어갑니다`);
    }
    if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${(await res.text()).slice(0, 200)}`);

    const json = await res.json();
    const parts: { text?: string; thought?: boolean }[] = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
    if (!text) throw new Error(`Gemini 응답 없음 (finishReason ${json?.candidates?.[0]?.finishReason ?? "?"})`);

    const verdict = acceptAdvice(JSON.parse(text), new Set(hitById.keys()), measures);
    if ("reason" in verdict) throw new Error(`Gemini 답변 거절: ${verdict.reason}`);
    return finish(verdict, "gemini");
  } catch (error) {
    console.error("[api/advisor] Gemini call failed, using fallback", error);
    return finish(fallbackAdvice(req, hits, measures), "fallback", error instanceof Error ? error.message : String(error));
  }
}

