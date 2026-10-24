import { readFileSync } from "node:fs";
import path from "node:path";
import { POLICY_FACTS } from "@/src/data/policy-facts";
import { listSupportProgramsSync } from "@/src/data/programs";

/**
 * 검색형 AI 상담의 검색 단계 — 법령 조문과 공고 사실 가운데 질문에 맞는 것을 고른다.
 *
 * 왜 임베딩이 아니라 BM25 인가:
 *  - 조문 수백 개 규모라 외부 호출 없이 메모리에서 끝난다(발표장 네트워크와 무관, 응답 즉시).
 *  - 같은 질문이면 같은 근거가 나온다(재현 가능) — 심사에서 "왜 이 조문인가"를 설명할 수 있다.
 * 한국어는 띄어쓰기·조사 때문에 단어 단위가 불안정해, 공백을 뺀 글자 2-gram 으로 색인한다.
 */

export interface LawChunk {
  /** `<문서명>|<조문>` — Gemini 가 인용할 때 이 값을 그대로 돌려줘야 한다. */
  id: string;
  source: string;
  /** 법률 · 대통령령 · 국토교통부령 · 고시 · 공고 · 지침 */
  kind: string;
  article: string;
  title: string | null;
  chapter: string | null;
  effectiveDate: string | null;
  text: string;
  url: string;
}

export interface LawHit extends LawChunk {
  score: number;
}

interface CorpusFile {
  generatedAt: string;
  chunks: LawChunk[];
}

const CORPUS_PATH = path.join(process.cwd(), "src", "data", "law-corpus.json");
/** 행정안전부 공공서비스(혜택) API 에서 받은 지원사업 — `node scripts/fetch-benefits.mjs` 가 만든다. 없어도 동작한다. */
const BENEFIT_PATH = path.join(process.cwd(), "src", "data", "benefit-corpus.json");

/** 지원사업 근거의 kind — 지역 필터를 이 값으로 건다. */
export const PROGRAM_KIND = "지원사업";

/**
 * 지원사업 목록(src/data/programs.ts)도 근거로 쓴다. "태양광 지원 있나요?" 같은 질문은 법령보다
 * 사업 안내가 답이기 때문이다. 접수 기간 문구는 자주 낡으므로 색인에 넣지 않는다.
 * 공식 링크가 확인되지 않은 사업은 지원사업 화면으로 연결한다(링크를 지어내지 않음).
 */
function programChunks(): LawChunk[] {
  return listSupportProgramsSync().map((p) => ({
    id: `지원사업|${p.id}`,
    source: p.name,
    kind: PROGRAM_KIND,
    article: p.region,
    title: p.tags.join("·") || null,
    chapter: p.provider,
    effectiveDate: null,
    text: `${p.name}. ${p.summary}. 대상: ${p.targetDesc}. 지원 내용: ${p.amountLabel}. 신청: ${p.applyMethod}.`,
    url: p.officialUrl ?? "/programs",
  }));
}

/**
 * 질문에 자주 나오는 생활어를 법령·기준에서 쓰는 말로 넓힌다.
 * 사용자는 "창가가 추워요" 라고 묻지만 조문에는 "창호", "단열", "열관류율" 이 나온다.
 */
const SYNONYMS: [RegExp, string][] = [
  [/추워|춥|외풍|웃풍|찬바람|결로|곰팡/, "단열 창호 열관류율 기밀 에너지성능"],
  [/창|유리|샷시|섀시/, "창호 창 열관류율"],
  [/벽|외벽/, "외벽 단열재 열관류율"],
  [/지붕|옥상|최상층/, "지붕 최상층 단열"],
  [/보일러|난방|가스/, "난방 설비 보일러 효율"],
  [/환기|공기/, "환기 열회수 설비"],
  [/조명|전등|형광등|LED/i, "조명 LED 전기"],
  [/관리비|요금|비용|돈|절약|아끼/, "에너지 절약 절감 효율 개선"],
  [/지원|보조|대출|이자|융자|돈|신청/, "지원 그린리모델링 보조금 금융 이자지원 신청"],
  [/등급|인증|성적/, "에너지효율등급 인증 에너지성능"],
  [/리모델링|공사|고치|개선/, "그린리모델링 리모델링 에너지 성능향상 개선"],
  [/탄소|온실가스|환경/, "온실가스 감축 에너지"],
  [/공공|어린이집|도서관|경로당|복지/, "공공건축물 그린리모델링"],
  [/태양광|태양열|신재생|재생에너지|패널/, "신재생에너지 재생에너지 태양광 설비 보급 지원"],
  [/저소득|취약|수급|차상위|바우처/, "취약계층 저소득층 에너지효율개선 바우처"],
];

const K1 = 1.4;
const B = 0.75;

function bigrams(text: string): string[] {
  const s = text.replace(/[\s\p{P}\p{S}]+/gu, "").toLowerCase();
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}

interface Index {
  chunks: LawChunk[];
  tf: Map<string, number>[];
  lengths: number[];
  avgLength: number;
  df: Map<string, number>;
  generatedAt: string | null;
}

let cached: Index | null = null;

function loadLawChunks(): { chunks: LawChunk[]; generatedAt: string | null } {
  try {
    const file = JSON.parse(readFileSync(CORPUS_PATH, "utf8")) as CorpusFile;
    return { chunks: Array.isArray(file.chunks) ? file.chunks : [], generatedAt: file.generatedAt ?? null };
  } catch {
    // 아직 `node scripts/fetch-laws.mjs` 를 돌리지 않았다 — 공고 사실만으로 동작한다.
    return { chunks: [], generatedAt: null };
  }
}

function loadBenefitChunks(): LawChunk[] {
  try {
    const file = JSON.parse(readFileSync(BENEFIT_PATH, "utf8")) as CorpusFile;
    return Array.isArray(file.chunks) ? file.chunks.filter((c) => c?.id && c?.text && c?.url) : [];
  } catch {
    return [];
  }
}

/** 색인은 처음 검색할 때 한 번만 만든다. 조문·공고는 실행 중에 바뀌지 않는다. */
function getIndex(): Index {
  if (cached) return cached;
  const { chunks: lawChunks, generatedAt } = loadLawChunks();
  const chunks = [...lawChunks, ...POLICY_FACTS, ...programChunks(), ...loadBenefitChunks()];
  const tf: Map<string, number>[] = [];
  const lengths: number[] = [];
  const df = new Map<string, number>();

  for (const chunk of chunks) {
    // 조문 제목·장 제목은 본문보다 주제를 잘 말해 주므로 한 번 더 넣어 가중치를 준다.
    const grams = bigrams(`${chunk.source} ${chunk.chapter ?? ""} ${chunk.title ?? ""} ${chunk.title ?? ""} ${chunk.text}`);
    const counts = new Map<string, number>();
    for (const g of grams) counts.set(g, (counts.get(g) ?? 0) + 1);
    for (const g of counts.keys()) df.set(g, (df.get(g) ?? 0) + 1);
    tf.push(counts);
    lengths.push(grams.length);
  }

  const avgLength = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 1;
  cached = { chunks, tf, lengths, avgLength, df, generatedAt };
  return cached;
}

/** 생활어 질문을 조문 어휘로 넓힌 검색어. */
export function expandQuery(question: string, contextTerms: string[]): string {
  const extra = SYNONYMS.filter(([re]) => re.test(question)).map(([, words]) => words);
  return [question, ...extra, ...contextTerms].join(" ");
}

/**
 * 상위 `limit` 개 조문. 같은 조문이 길어 여러 조각이면 가장 높은 조각 하나만 남긴다.
 * 점수가 0인 조문(겹치는 글자 쌍이 없음)은 근거가 될 수 없으므로 돌려주지 않는다.
 */
export function searchLaw(query: string, limit = 8): LawHit[] {
  const index = getIndex();
  const n = index.chunks.length;
  if (n === 0) return [];

  const qGrams = [...new Set(bigrams(query))];
  const scored: LawHit[] = [];

  index.chunks.forEach((chunk, i) => {
    const counts = index.tf[i];
    const len = index.lengths[i];
    let score = 0;
    for (const g of qGrams) {
      const f = counts.get(g);
      if (!f) continue;
      const df = index.df.get(g) ?? 0;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * len) / index.avgLength)));
    }
    if (score > 0) scored.push({ ...chunk, score });
  });

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: LawHit[] = [];
  for (const hit of scored) {
    const key = `${hit.source}|${hit.article}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

/** 상담 카드에 "법령 기준일" 을 보여 주려고. 코퍼스가 없으면 `null`. */
export function lawCorpusGeneratedAt(): string | null {
  return getIndex().generatedAt;
}
