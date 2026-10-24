// scripts/fetch-gas-2025.mjs
//
// 건축HUB 건물에너지정보 서비스(getBeGasUsgInfo)로 시범 3개 동의 2025년 1~12월 도시가스 사용량을 받는다.
// 전기(2025년 1년치)와 더해 "건물 유형별·규모별 에너지 등급 평가 기준(A~E)"을 매기는 데 쓴다.
//
// 실행: node scripts/fetch-gas-2025.mjs     (저장소 최상위 폴더에서)
//  - .env.local 의 BLDG_HUB_API_KEY (또는 DATA_GO_KR_API_KEY) 를 쓴다. 공공데이터포털에서
//    "국토교통부_건축HUB_건물에너지정보 서비스" 활용신청이 되어 있어야 한다(자동승인).
//  - 결과: data-raw/gas-2025-<법정동코드>.json  (기존 가스 파일과 같은 { Description, Data } 형식)
//  - 키 값은 결과 파일에 쓰지 않는다.
//
// API 는 번·지가 필수라 지번마다 12번 부른다. 개발계정 하루 10,000건 한도 안에서 끝나도록,
// 등급 기준표 대상(비주거 11개 용도, 연면적 3,000㎡ 이상)이 있는 지번만 받는다.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const ENDPOINT = "https://apis.data.go.kr/1613000/BldEngyHubService/getBeGasUsgInfo";
const MONTHS = Array.from({ length: 12 }, (_, i) => `2025${String(i + 1).padStart(2, "0")}`);
const CONCURRENCY = 2; // 초당 호출 제한(429) 때문에 낮게 유지
const GAP_MS = 350; // 호출 사이 간격
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT_DIR = "data-raw";

/** 등급 기준표가 있는 용도군 (pilot-buildings.json 의 grp 값). */
const CRITERIA_GROUPS = new Set([
  "문화및집회시설", "종교시설", "판매시설", "의료시설", "교육연구시설",
  "노유자시설", "업무시설", "숙박시설", "공장", "창고시설", "근린생활시설",
]);

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
const KEY = env.BLDG_HUB_API_KEY || env.DATA_GO_KR_API_KEY;
if (!KEY) {
  console.error("BLDG_HUB_API_KEY 가 없습니다. .env.local 에 공공데이터포털 인증키를 넣어 주세요.");
  process.exit(1);
}
// 공공데이터포털 키는 인코딩/디코딩 두 형태가 있다 — 이미 인코딩된 키는 그대로 쓴다.
const SERVICE_KEY = KEY.includes("%") ? KEY : encodeURIComponent(KEY);

const pilot = JSON.parse(readFileSync("src/data/pilot-buildings.json", "utf8"));
const col = (name) => pilot.columns.indexOf(name);

async function call(params) {
  const qs = new URLSearchParams({ ...params, _type: "json", numOfRows: "100", pageNo: "1" });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const res = await fetch(`${ENDPOINT}?serviceKey=${SERVICE_KEY}&${qs}`, { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      if (res.status === 429) { await sleep(1500 * (attempt + 1)); throw new Error("HTTP 429 초당 호출 제한"); }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        // 키 미등록·트래픽 초과 등은 XML 오류로 온다.
        throw new Error(`JSON 아님: ${text.replace(KEY, "<KEY>").slice(0, 200)}`);
      }
      const code = json?.response?.header?.resultCode;
      if (code && code !== "00") throw new Error(`resultCode ${code} ${json?.response?.header?.resultMsg ?? ""}`);
      const raw = json?.response?.body?.items?.item;
      return raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    } catch (err) {
      if (attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return [];
}

/** 동시에 n개씩 실행. */
async function pool(tasks, n, onDone) {
  let next = 0;
  const workers = Array.from({ length: n }, async () => {
    while (next < tasks.length) {
      const i = next++;
      await tasks[i]();
      await sleep(GAP_MS);
      onDone?.();
    }
  });
  await Promise.all(workers);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const [code, dong] of Object.entries(pilot.dongs)) {
  const sigunguCd = code.slice(0, 5);
  const bjdongCd = code.slice(5);

  // 등급 기준표 대상 건물이 있는 지번만 모은다.
  const parcels = new Map();
  for (const r of dong.rows) {
    if (!CRITERIA_GROUPS.has(r[col("grp")]) || (r[col("area")] ?? 0) < 3000) continue;
    const pg = String(r[col("pg")]);
    const bun = String(r[col("bun")]).padStart(4, "0");
    const ji = String(r[col("ji")]).padStart(4, "0");
    parcels.set(`${pg}-${bun}-${ji}`, { pg, bun, ji });
  }
  console.log(`\n[${dong.name}] 대상 지번 ${parcels.size}곳 × 12개월 = ${parcels.size * 12}회 호출`);

  const rows = [];
  const errors = [];
  let done = 0;
  const total = parcels.size * MONTHS.length;
  const tasks = [];
  for (const { pg, bun, ji } of parcels.values()) {
    for (const useYm of MONTHS) {
      tasks.push(async () => {
        try {
          const items = await call({ sigunguCd, bjdongCd, platGbCd: pg, bun, ji, useYm });
          for (const it of items) {
            rows.push({
              PLOT_PSTN: it.platPlc ?? null,
              SGG_CD: sigunguCd,
              STDG_CD: bjdongCd,
              PLOT_SE_CD: String(it.platGbCd ?? pg),
              MNO: String(it.bun ?? bun).padStart(4, "0"),
              SNO: String(it.ji ?? ji).padStart(4, "0"),
              USE_YM: String(it.useYm ?? useYm),
              USGQTY: Number(it.useQty ?? 0),
            });
          }
        } catch (err) {
          errors.push(`${pg}-${bun}-${ji} ${useYm}: ${err.message}`);
        }
      });
    }
  }
  await pool(tasks, CONCURRENCY, () => {
    done += 1;
    if (done % 100 === 0 || done === total) process.stdout.write(`\r  ${done}/${total}`);
  });

  const file = `${OUT_DIR}/gas-2025-${code}.json`;
  writeFileSync(
    file,
    JSON.stringify(
      {
        Description: { USE_YM: "사용년월", USGQTY: "사용량(KWh)", source: "건축HUB 건물에너지정보 서비스 getBeGasUsgInfo" },
        Data: rows,
        errors: errors.slice(0, 50),
      },
      null,
      0,
    ),
    "utf8",
  );
  console.log(`\n  저장: ${file} · ${rows.length}행 · 오류 ${errors.length}건${errors.length ? ` (예: ${errors[0]})` : ""}`);
}

console.log(`\n완료. ${OUT_DIR}/ 의 gas-2025-*.json 3개를 Claude 에게 알려 주세요.`);
