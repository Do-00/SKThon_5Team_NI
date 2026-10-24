// scripts/gemini-check.mjs — Gemini 키·모델 점검.  실행: node scripts/gemini-check.mjs [모델이름]
// 1) 이 키로 쓸 수 있는 모델 목록  2) 지정(또는 .env.local 의 GEMINI_MODEL) 모델로 짧은 호출  결과를 보여 준다.
// 키 값은 출력하지 않는다.
import { readFileSync, existsSync } from "node:fs";

function readEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, eq).trim()] = v;
  }
  return env;
}
const env = { ...readEnv(".env.local"), ...process.env };
const KEY = env.GEMINI_API_KEY;
if (!KEY) { console.error("GEMINI_API_KEY 가 .env.local 에 없습니다."); process.exit(1); }
const scrub = (t) => String(t).split(KEY).join("<KEY>");
const model = process.argv[2] || env.GEMINI_MODEL || "gemini-3.5-flash";
console.log(`키 길이 ${KEY.length}자, 앞 ${KEY.slice(0, 4)}…  /  점검 모델: ${model}\n`);

const list = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${KEY}`);
const listText = await list.text();
if (!list.ok) {
  console.log(`[모델 목록] HTTP ${list.status}\n${scrub(listText).slice(0, 400)}\n→ 키가 잘못됐거나 이 프로젝트에서 Gemini API 가 꺼져 있습니다.`);
} else {
  const names = (JSON.parse(listText).models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => m.name.replace("models/", ""))
    .filter((n) => /^gemini-/.test(n));
  console.log(`[모델 목록] generateContent 가능한 gemini 모델 ${names.length}개:\n  ${names.join("\n  ")}\n`);
  if (!names.includes(model)) console.log(`※ "${model}" 은 이 목록에 없습니다. 위 이름 중 하나를 GEMINI_MODEL 에 쓰세요.\n`);
}

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contents: [{ parts: [{ text: "한 단어로 답하세요: 하늘 색은?" }] }] }),
});
const text = await res.text();
console.log(`[호출 테스트] ${model} → HTTP ${res.status}`);
console.log(scrub(text).slice(0, 500));
if (res.status === 429) console.log("\n→ 할당량 소진. 다른 모델 이름으로 다시 실행해 보세요: node scripts/gemini-check.mjs gemini-2.5-flash-lite");
if (res.status === 404) console.log("\n→ 모델 이름이 없습니다. 위 목록에서 고르세요.");
if (res.status === 503) console.log("\n→ 일시 과부하. 잠시 뒤 다시.");
