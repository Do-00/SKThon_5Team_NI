// scripts/fetch-laws.mjs
//
// 국가법령정보 OPEN API(open.law.go.kr)로 그린리모델링 관련 법령·고시를 받아
// 조문 단위로 잘라 src/data/law-corpus.json 에 저장한다.
//
// 실행: node scripts/fetch-laws.mjs   (저장소 최상위 폴더에서, .env.local 에 LAW_API_OC 필요)
//
// 왜 미리 받아 두나:
//  - 검색형 AI 상담(/api/advisor)이 발표장 네트워크와 API 승인 상태에 상관없이 동작한다.
//  - 어떤 조문을 근거로 답했는지 저장소만으로 재현된다.
//  - OC 값은 결과 파일에 쓰지 않는다.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BASE = "https://www.law.go.kr/DRF";
const OUT_FILE = "src/data/law-corpus.json";
const DEBUG_DIR = "law-probe";
/** 한 덩어리가 이보다 길면 나눈다 — 검색 정밀도와 프롬프트 길이를 같이 지키려고. */
const MAX_CHUNK_CHARS = 1200;

/**
 * 받을 문서 목록. 검색어로 찾고, `match` 로 정확히 고른다.
 * 법령(law)은 법령일련번호(MST), 행정규칙(admrul)은 행정규칙일련번호(ID)로 전문을 받는다.
 */
export const SOURCES = [
  { target: "law", query: "녹색건축물 조성 지원법", match: (n) => n === "녹색건축물 조성 지원법" },
  { target: "law", query: "녹색건축물 조성 지원법", match: (n) => n === "녹색건축물 조성 지원법 시행령" },
  { target: "law", query: "녹색건축물 조성 지원법", match: (n) => n === "녹색건축물 조성 지원법 시행규칙" },
  { target: "law", query: "제로에너지건축물 인증", match: (n) => n.includes("제로에너지건축물 인증") },
  { target: "admrul", query: "건축물의 에너지절약설계기준", match: (n) => n === "건축물의 에너지절약설계기준" },
  { target: "admrul", query: "제로에너지건축물 인증 기준", match: (n) => n.includes("제로에너지건축물 인증") },
  { target: "admrul", query: "그린리모델링", match: (n) => n.includes("그린리모델링") },
];

// ─── 환경변수 ───────────────────────────────────────────────────────────────

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, eq).trim()] = value;
  }
  return env;
}

// ─── 공통 유틸 ──────────────────────────────────────────────────────────────

/** API는 결과가 1건이면 배열 대신 객체 하나를 준다 — 항상 배열로 맞춘다. */
const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** 목내용처럼 [[...]] 로 오는 값을 문자열 배열로 편다. */
function flatStrings(v) {
  if (v == null) return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(flatStrings);
  if (typeof v === "object" && typeof v.content === "string") return [v.content];
  return [];
}

const clean = (s) => s.replace(/\s+/g, " ").trim();

/** law.go.kr 공개 주소 — 법령명 공백을 빼면 바로 열린다. 인용 링크로 쓴다(OC 없음). */
export function publicUrl(kind, name, article) {
  const base = kind === "admrul" ? "행정규칙" : "법령";
  const path = [base, name.replace(/\s+/g, "")];
  if (article && kind !== "admrul") path.push(article);
  return `https://www.law.go.kr/${path.map(encodeURIComponent).join("/")}`;
}

/** 긴 조문은 문장 경계에서 나눈다. 나뉜 조각도 같은 조문 번호를 가진다. */
function splitLong(text) {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const parts = [];
  let rest = text;
  while (rest.length > MAX_CHUNK_CHARS) {
    // 항·호 표시나 마침표 뒤에서 자른다. 못 찾으면 그냥 길이에서 자른다.
    const window = rest.slice(0, MAX_CHUNK_CHARS);
    const cut = Math.max(window.lastIndexOf(" ②"), window.lastIndexOf(" ③"), window.lastIndexOf(". "), window.lastIndexOf("다. "));
    const at = cut > MAX_CHUNK_CHARS * 0.4 ? cut + 1 : MAX_CHUNK_CHARS;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

// ─── 법령(law) 전문 → 조문 덩어리 ───────────────────────────────────────────

/** 항 → 호 → 목 순서로 본문을 모은다. 항이 `{호:[...]}` 처럼 내용 없이 올 때도 있다. */
function collectParagraphs(node) {
  return asArray(node).flatMap((p) => {
    if (typeof p !== "object" || p === null) return [];
    return [
      ...flatStrings(p.항내용),
      ...flatStrings(p.호내용),
      ...flatStrings(p.목내용),
      ...collectParagraphs(p.호),
      ...collectParagraphs(p.목),
    ];
  });
}

/**
 * `lawService.do?target=law` JSON 을 조문 덩어리로 편다.
 * 장(章) 제목(`조문여부: "전문"`)은 덩어리를 만들지 않고 이후 조문의 chapter 로 붙인다.
 */
export function flattenLaw(json) {
  const law = json?.법령;
  if (!law) return null;
  const info = law.기본정보 ?? {};
  const name = info.법령명_한글;
  const kind = info.법종구분?.content ?? "법령";
  const effectiveDate = info.시행일자 ?? null;
  const chunks = [];
  let chapter = null;

  for (const unit of asArray(law.조문?.조문단위)) {
    const head = clean(flatStrings(unit.조문내용).join(" "));
    if (unit.조문여부 !== "조문") {
      chapter = head.replace(/<[^>]*>/g, "").trim() || chapter;
      continue;
    }
    // 삭제된 조문은 근거로 쓸 수 없다.
    if (/^제\d+조(의\d+)?\s*삭제/.test(head)) continue;

    const article = `제${unit.조문번호}조${unit.조문가지번호 ? `의${unit.조문가지번호}` : ""}`;
    const text = clean([head, ...collectParagraphs(unit.항)].join(" "));
    splitLong(text).forEach((part, i, all) => {
      chunks.push({
        id: `${name}|${article}${all.length > 1 ? `#${i + 1}` : ""}`,
        source: name,
        kind,
        article,
        title: unit.조문제목 ?? null,
        chapter,
        effectiveDate,
        text: part,
        url: publicUrl("law", name, article),
      });
    });
  }
  return { name, kind, effectiveDate, chunks };
}

// ─── 행정규칙(admrul) 전문 → 조문 덩어리 ────────────────────────────────────

/** 이름 그대로의 키를 객체 어디서든 찾는다(응답 껍데기 이름이 문서마다 다를 수 있어서). */
function findKey(node, key) {
  const stack = [node];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (!Array.isArray(cur) && key in cur) return cur[key];
    stack.push(...Object.values(cur));
  }
  return undefined;
}

/**
 * 행정규칙은 조문내용이 문자열 배열로 오는 경우가 많다. 줄을 이어 붙이다가
 * "제N조" 로 시작하는 줄에서 새 덩어리를 연다. "제N장" 은 chapter 로 기억한다.
 */
export function flattenAdmrul(json) {
  const name = findKey(json, "행정규칙명");
  if (!name) return null;
  const kind = findKey(json, "행정규칙종류") ?? "고시";
  const effectiveDate = findKey(json, "시행일자") ?? null;
  const lines = flatStrings(findKey(json, "조문내용")).map(clean).filter(Boolean);
  const chunks = [];
  let chapter = null;
  let current = null;

  const flush = () => {
    if (!current) return;
    splitLong(clean(current.lines.join(" "))).forEach((part, i, all) => {
      chunks.push({
        id: `${name}|${current.article}${all.length > 1 ? `#${i + 1}` : ""}`,
        source: name,
        kind,
        article: current.article,
        title: current.title,
        chapter,
        effectiveDate,
        text: part,
        url: publicUrl("admrul", name),
      });
    });
    current = null;
  };

  for (const line of lines) {
    const ch = line.match(/^제\d+장\s*(.*)$/);
    if (ch) {
      flush();
      chapter = line;
      continue;
    }
    const art = line.match(/^(제\d+조(?:의\d+)?)\s*(?:\(([^)]*)\))?/);
    if (art) {
      flush();
      if (/^제\d+조(의\d+)?\s*삭제/.test(line)) continue;
      current = { article: art[1], title: art[2] ?? null, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return { name, kind, effectiveDate, chunks };
}

// ─── 실행 ───────────────────────────────────────────────────────────────────

async function getJson(path, params, OC) {
  const qs = new URLSearchParams({ OC, type: "JSON", ...params });
  const res = await fetch(`${BASE}/${path}?${qs}`, { headers: { Accept: "application/json" } });
  const text = (await res.text()).split(OC).join("<OC>");
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  try {
    return { json: JSON.parse(text), text };
  } catch {
    throw new Error(`JSON 이 아닌 응답: ${text.slice(0, 200)}`);
  }
}

/** 검색 결과에서 이름이 맞는 현행 문서를 고른다. */
function pickFromSearch(json, target, match) {
  const list = asArray(target === "law" ? json?.LawSearch?.law : json?.AdmRulSearch?.admrul);
  return list
    .filter((it) => (it.현행연혁코드 ?? it.현행연혁구분 ?? "현행") === "현행")
    .filter((it) => match(target === "law" ? it.법령명한글 : it.행정규칙명));
}

async function main() {
  const OC = process.env.LAW_API_OC ?? readEnvFile(".env.local").LAW_API_OC;
  if (!OC) {
    console.error("LAW_API_OC 가 없습니다. .env.local 에 LAW_API_OC=발급받은OC값 을 추가하세요.");
    process.exit(1);
  }
  mkdirSync(DEBUG_DIR, { recursive: true });

  const documents = [];
  const seen = new Set();

  for (const { target, query, match } of SOURCES) {
    let picks;
    try {
      const { json } = await getJson("lawSearch.do", { target, query, display: "20" }, OC);
      picks = pickFromSearch(json, target, match);
    } catch (err) {
      console.error(`[검색 실패] ${target} "${query}": ${err.message}`);
      continue;
    }
    if (picks.length === 0) console.warn(`[없음] ${target} "${query}" 에 맞는 현행 문서가 없습니다.`);

    for (const item of picks) {
      const key = target === "law" ? item.법령일련번호 : item.행정규칙일련번호;
      if (seen.has(`${target}:${key}`)) continue;
      seen.add(`${target}:${key}`);
      const params = target === "law" ? { target, MST: key } : { target, ID: key };
      try {
        const { json, text } = await getJson("lawService.do", params, OC);
        const doc = target === "law" ? flattenLaw(json) : flattenAdmrul(json);
        if (!doc || doc.chunks.length === 0) {
          // 구조가 예상과 다르면 원문을 남겨 두고 넘어간다 — 이 파일을 보고 파서를 고친다.
          const file = `${DEBUG_DIR}/unparsed-${target}-${key}.txt`;
          writeFileSync(file, text.slice(0, 300_000), "utf8");
          console.warn(`[분해 실패] ${target} ${key} → ${file} 를 확인하세요.`);
          continue;
        }
        documents.push({ target, ...doc });
        console.log(`[OK] ${doc.name} (${doc.kind}, 시행 ${doc.effectiveDate}) → 조문 ${doc.chunks.length}개`);
      } catch (err) {
        console.error(`[전문 실패] ${target} ${key}: ${err.message}`);
      }
    }
  }

  const corpus = {
    generatedAt: new Date().toISOString(),
    source: "국가법령정보 공동활용 OPEN API (open.law.go.kr)",
    documents: documents.map(({ target, name, kind, effectiveDate, chunks }) => ({
      target,
      name,
      kind,
      effectiveDate,
      url: publicUrl(target, name),
      chunkCount: chunks.length,
    })),
    chunks: documents.flatMap((d) => d.chunks),
  };
  writeFileSync(OUT_FILE, JSON.stringify(corpus, null, 1), "utf8");
  console.log(`\n저장: ${OUT_FILE} · 문서 ${corpus.documents.length}개 · 조문 덩어리 ${corpus.chunks.length}개`);
}

// 다른 파일에서 파서만 가져다 쓸 수 있게, 직접 실행할 때만 main 을 돈다.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
