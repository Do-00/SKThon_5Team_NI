/**
 * 카카오 로컬 API 진단용. 한 건만 호출하고 응답을 그대로 찍습니다.
 *
 *   $env:KAKAO_REST_KEY = "키"
 *   node scripts/kakao-test.mjs
 */
const KEY = process.env.KAKAO_REST_KEY;
if (!KEY) { console.error("KAKAO_REST_KEY 없음"); process.exit(1); }
console.log("키 길이:", KEY.length, "| 앞 6자:", KEY.slice(0, 6));

async function hit(label, url) {
  console.log("\n── " + label + " ──");
  console.log(url);
  try {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
    console.log("HTTP", res.status, res.statusText);
    const text = await res.text();
    console.log(text.slice(0, 600));
  } catch (e) {
    console.log("요청 실패:", e.name, "-", e.message);
    if (e.cause) console.log("  cause:", e.cause.code ?? e.cause.message);
  }
}

await hit("주소 검색",
  "https://dapi.kakao.com/v2/local/search/address.json?query=" + encodeURIComponent("서울 강서구"));
await hit("키워드 검색",
  "https://dapi.kakao.com/v2/local/search/keyword.json?query=" + encodeURIComponent("서울 강서구청") + "&size=1");
await hit("백엔드 확인", (process.env.BEEC_API_BASE_URL ?? "http://localhost:8080") + "/api/districts?minSample=5");
