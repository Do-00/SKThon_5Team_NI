/**
 * 전국 시군구 중심좌표를 한 번만 받아서 파일로 저장합니다.
 *
 * 왜 한 번만 받나:
 *   발표 중에 지오코딩을 호출하면 현장 와이파이가 느릴 때 지도가 비어 보입니다.
 *   좌표는 변하지 않으므로 지금 받아서 커밋해두고, 런타임에는 이 파일만 읽습니다.
 *
 * 사용법:
 *   1) 백엔드를 8080 에 띄워둡니다.
 *   2) 카카오 REST API 키를 환경변수로 넣고 실행합니다.
 *
 *      Windows PowerShell:
 *        $env:KAKAO_REST_KEY = "여기에_REST_API_키"
 *        node scripts/fetch-district-coords.mjs
 *
 *      macOS / Linux:
 *        KAKAO_REST_KEY=여기에_키 node scripts/fetch-district-coords.mjs
 *
 *   3) src/data/district-coords.json 이 생깁니다. 이 파일을 커밋하세요.
 *
 * 주의: JavaScript 키가 아니라 REST API 키입니다. 카카오 개발자센터 > 내 애플리케이션 > 앱 키.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const KAKAO_KEY = process.env.KAKAO_REST_KEY;
const BEEC = process.env.BEEC_API_BASE_URL ?? "http://localhost:8080";
const OUT = "src/data/district-coords.json";
const MIN_SAMPLE = Number(process.env.MIN_SAMPLE ?? 5);

if (!KAKAO_KEY) {
  console.error("KAKAO_REST_KEY 환경변수가 없습니다. 위 주석의 사용법을 보세요.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 카카오 주소검색. 실패하면 키워드검색으로 한 번 더 시도합니다. */
async function geocode(query) {
  const headers = { Authorization: `KakaoAK ${KAKAO_KEY}` };

  const addr = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
    { headers },
  );
  if (addr.status === 401) throw new Error("카카오 키가 거부되었습니다(401). REST API 키가 맞는지 확인하세요.");
  if (addr.ok) {
    const j = await addr.json();
    const d = j.documents?.[0];
    if (d) return { lat: Number(d.y), lng: Number(d.x), via: "address" };
  }

  // 주소로 안 잡히는 이름(택지지구명 등)은 키워드로 시도
  const kw = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`,
    { headers },
  );
  if (kw.ok) {
    const j = await kw.json();
    const d = j.documents?.[0];
    if (d) return { lat: Number(d.y), lng: Number(d.x), via: "keyword" };
  }
  return null;
}

async function main() {
  console.log(`백엔드에서 동네 목록을 가져옵니다: ${BEEC}/api/districts?minSample=${MIN_SAMPLE}`);
  const res = await fetch(`${BEEC}/api/districts?minSample=${MIN_SAMPLE}`);
  if (!res.ok) {
    console.error(`백엔드 응답 실패 (${res.status}). 서버가 떠 있는지 확인하세요.`);
    process.exit(1);
  }
  const { districts } = await res.json();
  console.log(`대상 ${districts.length}개\n`);

  const out = [];
  const failed = [];

  for (let i = 0; i < districts.length; i++) {
    const d = districts[i];
    // "서울 강서구" 형태 그대로 넣는 것이 정확도가 가장 높습니다.
    const query = d.key;

    let hit = null;
    try {
      hit = await geocode(query);
    } catch (e) {
      console.error(`\n${e.message}`);
      process.exit(1);
    }

    if (hit) {
      out.push({
        key: d.key,
        region: d.region,
        district: d.district,
        lat: Number(hit.lat.toFixed(5)),
        lng: Number(hit.lng.toFixed(5)),
      });
      process.stdout.write(hit.via === "keyword" ? "k" : ".");
    } else {
      failed.push(d.key);
      process.stdout.write("x");
    }

    if ((i + 1) % 50 === 0) process.stdout.write(` ${i + 1}\n`);
    await sleep(60); // 초당 약 16건. 여유 있게 둡니다.
  }

  console.log("\n");

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Kakao Local API",
    minSample: MIN_SAMPLE,
    count: out.length,
    districts: out,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2), "utf-8");

  console.log(`성공 ${out.length}개 → ${OUT}`);
  if (failed.length) {
    console.log(`실패 ${failed.length}개: ${failed.join(", ")}`);
    console.log("실패한 곳은 지도에서 빼고 순위 목록에만 남기면 됩니다.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
