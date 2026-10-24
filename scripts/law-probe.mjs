// scripts/law-probe.mjs
// 국가법령정보 OPEN API 응답 구조 확인용 스크립트.
// 실행: node scripts/law-probe.mjs  (저장소 최상위 폴더에서)
// - OC 값은 .env.local 의 LAW_API_OC 에서 읽고, 결과 파일에는 절대 쓰지 않는다.
// - 결과는 law-probe/ 폴더에 저장된다. 이 폴더의 파일을 Claude 에게 첨부하면 된다.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const BASE = "https://www.law.go.kr/DRF";
const OUT_DIR = "law-probe";
const MAX_SAVE = 200_000; // 전문 응답이 커도 구조 확인에는 앞부분이면 충분하다

// dotenv 없이 .env.local 을 읽는다. 양쪽 따옴표는 벗긴다.
function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const OC = process.env.LAW_API_OC ?? readEnvFile(".env.local").LAW_API_OC;
if (!OC) {
  console.error("LAW_API_OC 가 없습니다. .env.local 에 LAW_API_OC=발급받은OC값 을 추가하세요.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

// 혹시 응답 본문에 OC 가 메아리처럼 들어오면 지운다.
const scrub = (text) => text.split(OC).join("<OC>");

async function call(path, params, label) {
  const qs = new URLSearchParams({ OC, type: "JSON", ...params });
  const url = `${BASE}/${path}?${qs}`;
  const startedAt = Date.now();
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = scrub(await res.text());
    const file = `${OUT_DIR}/${label}.txt`;
    writeFileSync(
      file,
      `# ${path} ${JSON.stringify(params)}\n# HTTP ${res.status} · ${res.headers.get("content-type")} · ${Date.now() - startedAt}ms · ${text.length}자\n\n` +
        text.slice(0, MAX_SAVE),
      "utf8",
    );
    console.log(`[${res.status}] ${label} → ${file} (${text.length}자)`);
    try {
      return JSON.parse(text);
    } catch {
      return null; // JSON 이 아니면(오류 HTML, 미승인 안내 등) 원문 파일로 확인
    }
  } catch (err) {
    console.error(`[실패] ${label}: ${err.message}`);
    return null;
  }
}

// 응답 키 이름을 모르는 상태라, 객체를 훑어 첫 번째 목록 항목을 찾는다.
function firstItem(json) {
  const stack = [json];
  while (stack.length) {
    const node = stack.shift();
    if (Array.isArray(node)) {
      if (node.length && typeof node[0] === "object") return node[0];
    } else if (node && typeof node === "object") {
      stack.push(...Object.values(node));
    }
  }
  return null;
}

// "일련번호", "ID" 가 들어간 필드를 골라 전문 조회 후보로 쓴다.
function idCandidates(item) {
  if (!item) return [];
  const out = [];
  for (const [k, v] of Object.entries(item)) {
    if (v === null || typeof v === "object") continue;
    if (k.includes("일련번호")) out.push({ param: "MST", value: String(v), from: k });
    if (/ID$/i.test(k) || k.includes("ID")) out.push({ param: "ID", value: String(v), from: k });
  }
  return out;
}

const probes = [
  { target: "law", query: "녹색건축물 조성 지원법" },
  { target: "admrul", query: "건축물의 에너지절약설계기준" },
];

for (const { target, query } of probes) {
  const search = await call("lawSearch.do", { target, query, display: "5" }, `search-${target}`);
  const item = firstItem(search);
  if (!item) {
    console.log(`  ${target}: 목록 항목을 찾지 못함. search-${target}.txt 를 확인하세요.`);
    continue;
  }
  console.log(`  ${target} 첫 항목 필드: ${Object.keys(item).join(", ")}`);
  // 후보마다 한 번씩 전문 조회를 시도해, 어떤 파라미터가 통하는지 같이 확인한다.
  for (const [i, c] of idCandidates(item).entries()) {
    await call("lawService.do", { target, [c.param]: c.value }, `service-${target}-${i}-${c.param}`);
  }
}

console.log(`\n완료. ${OUT_DIR}/ 폴더의 파일을 Claude 에게 첨부하세요. (OC 값은 파일에 들어 있지 않습니다)`);
