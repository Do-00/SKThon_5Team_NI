// scripts/fetch-benefits.mjs
//
// 행정안전부_대한민국 공공서비스(혜택) 정보 API(보조금24)에서 그린리모델링·에너지 관련 지원사업을 받아
// src/data/benefit-corpus.json 에 저장한다. 검색형 AI 상담(law-search.ts)이 지원사업 근거로 함께 쓴다.
//
// 실행: node scripts/fetch-benefits.mjs            (저장소 최상위 폴더에서)
//       node scripts/fetch-benefits.mjs --probe    (한 건만 받아 응답 구조를 data-raw/gov24-probe.json 에 저장)
//  - .env.local 의 GOV24_API_KEY (없으면 BLDG_HUB_API_KEY, DATA_GO_KR_API_KEY) 를 쓴다.
//  - 공공데이터포털에서 "행정안전부_대한민국 공공서비스(혜택) 정보" 활용신청이 되어 있어야 한다(자동승인).
//  - 키 값은 결과 파일에 쓰지 않는다.
//
// 지역 필터 때문에 "전국(중앙부처)"과 "시·도 단위" 사업만 받는다. 시·군·구 단위 사업은 건물의 구를
// 알 수 없어 엉뚱한 구에 보일 수 있으므로 제외한다.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const BASE = "https://api.odcloud.kr/api/gov24/v3";
const OUT_FILE = "src/data/benefit-corpus.json";
const PROBE = process.argv.includes("--probe");

/** 서비스명에 이 말이 들어간 사업을 찾는다. 그린리모델링과 직접 이어지는 낱말 위주. */
const KEYWORDS = [
  "그린리모델링", "에너지효율", "단열", "창호", "노후주택", "집수리", "주택개량",
  "에너지 성능", "태양광", "에너지바우처", "에너지 절약", "건물에너지", "제로에너지", "저탄소",
];

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[line.slice(0, eq).trim()] = value;
  }
  return env;
}

const env = { ...readEnvFile(".env.local"), ...process.env };
const KEY = env.GOV24_API_KEY || env.BLDG_HUB_API_KEY || env.DATA_GO_KR_API_KEY;
if (!KEY) {
  console.error("GOV24_API_KEY(또는 BLDG_HUB_API_KEY)가 없습니다. .env.local 에 공공데이터포털 인증키를 넣어 주세요.");
  process.exit(1);
}
// 인코딩된 키(%포함)는 그대로, 디코딩된 키는 인코딩해서 쓴다.
const SERVICE_KEY = KEY.includes("%") ? KEY : encodeURIComponent(KEY);
const scrub = (t) => String(t).split(KEY).join("<KEY>").split(SERVICE_KEY).join("<KEY>");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, params) {
  const qs = new URLSearchParams({ returnType: "JSON", ...params });
  const url = `${BASE}/${path}?serviceKey=${SERVICE_KEY}&${qs}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const text = await res.text();
      if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${scrub(text).slice(0, 200)}`);
      return JSON.parse(text);
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(800 * (attempt + 1));
    }
  }
  return null;
}

/** 필드명이 한글로 오지만 버전에 따라 조금 달라질 수 있어, 후보 이름을 차례로 본다. */
const pick = (o, names) => {
  for (const n of names) if (o?.[n] != null && String(o[n]).trim() !== "") return String(o[n]).trim();
  return "";
};

mkdirSync("data-raw", { recursive: true });

if (PROBE) {
  const json = await call("serviceList", { page: "1", perPage: "2", "cond[서비스명::LIKE]": "그린리모델링" });
  writeFileSync("data-raw/gov24-probe.json", scrub(JSON.stringify(json, null, 1)), "utf8");
  console.log("저장: data-raw/gov24-probe.json — 이 파일을 Claude 에게 첨부해 주세요.");
  console.log("필드:", Object.keys(json?.data?.[0] ?? json ?? {}).join(", "));
  process.exit(0);
}

const found = new Map();
for (const kw of KEYWORDS) {
  let page = 1;
  for (;;) {
    const json = await call("serviceList", { page: String(page), perPage: "100", "cond[서비스명::LIKE]": kw });
    const rows = json?.data ?? [];
    for (const r of rows) {
      const id = pick(r, ["서비스ID", "svcId"]);
      if (id) found.set(id, r);
    }
    const total = Number(json?.matchCount ?? json?.totalCount ?? rows.length);
    if (rows.length === 0 || page * 100 >= total) break;
    page += 1;
    await sleep(250);
  }
  console.log(`"${kw}" → 누계 ${found.size}건`);
  await sleep(250);
}

const sido = /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주)/;
const chunks = [];
for (const [id, r] of found) {
  const name = pick(r, ["서비스명"]);
  const org = pick(r, ["소관기관명"]);
  const orgType = pick(r, ["소관기관유형"]);
  if (!name) continue;

  // 지역: 중앙행정기관·공공기관은 전국, 시·도 한 단어면 그 지역, 시·군·구는 제외.
  let region = "전국";
  if (/지방자치|시도|시군구|지자체/.test(orgType) || sido.test(org)) {
    const words = org.split(/\s+/);
    if (!sido.test(words[0]) || words.length > 1) continue;
    region = words[0];
  }

  const parts = [
    `${name}.`,
    pick(r, ["서비스목적요약", "서비스목적"]) && `목적: ${pick(r, ["서비스목적요약", "서비스목적"])}`,
    pick(r, ["지원대상"]) && `대상: ${pick(r, ["지원대상"])}`,
    pick(r, ["선정기준"]) && `선정 기준: ${pick(r, ["선정기준"])}`,
    pick(r, ["지원내용"]) && `지원 내용: ${pick(r, ["지원내용"])}`,
    pick(r, ["신청방법"]) && `신청 방법: ${pick(r, ["신청방법"])}`,
  ].filter(Boolean);
  const text = parts.join(" ").replace(/\s+/g, " ").slice(0, 700);

  chunks.push({
    id: `공공서비스|${id}`,
    source: name,
    kind: "지원사업",
    article: region,
    title: pick(r, ["서비스분야"]) || null,
    chapter: org || null,
    effectiveDate: null,
    text,
    url: pick(r, ["상세조회URL"]) || `https://www.gov.kr/portal/rcvfvrSvc/dtlEx/${id}`,
  });
}

writeFileSync(
  OUT_FILE,
  JSON.stringify(
    { generatedAt: new Date().toISOString().slice(0, 10), source: "행정안전부_대한민국 공공서비스(혜택) 정보", chunks },
    null,
    1,
  ),
  "utf8",
);
console.log(`\n저장: ${OUT_FILE} · 지원사업 ${chunks.length}건 (검색 ${found.size}건 중 전국·시도 단위만)`);
