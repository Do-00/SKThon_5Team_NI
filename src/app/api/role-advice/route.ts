import { NextResponse } from "next/server";
import {
  buildRoleAdvicePrompt,
  fallbackRoleAdvice,
  type RoleAdviceInput,
} from "@/src/lib/role-advice";

/**
 * Gemini Flash를 서버에서만 호출하는 라우트 핸들러.
 *
 * `src/app/api/remodel-report/route.ts`와 같은 이유로 `GEMINI_API_KEY`는
 * 여기서만 쓰이고 클라이언트 번들에는 절대 노출되지 않는다.
 */

// gemini-2.0-flash 는 서비스 종료(404). 3.6-flash 는 한 번에 50초 이상 걸리고 과부하(503)가
// 잦아서, 사고를 최소로 둔 3.5-flash(약 2초)를 쓴다.
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
/** 이 시간 안에 답이 없으면 규칙 기반 문구로 넘어간다. */
const GEMINI_TIMEOUT_MS = 60_000;

export async function POST(request: Request) {
  const input = (await request.json()) as RoleAdviceInput;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ advice: fallbackRoleAdvice(input), source: "fallback" });
  }

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildRoleAdvicePrompt(input) }] }],
        // 사고(thinking) 토큰도 이 한도에서 빠지므로 2~3문장이 잘리지 않게 여유를 둔다.
        generationConfig: { maxOutputTokens: 1024, temperature: 0.6, thinkingConfig: { thinkingLevel: "minimal" } },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const json = await res.json();
    // 사고를 켜면 parts 가 여러 조각으로 올 수 있다 — 사고 조각을 빼고 텍스트를 이어 붙인다.
    const parts: { text?: string; thought?: boolean }[] = json?.candidates?.[0]?.content?.parts ?? [];
    const advice = parts
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("")
      .trim();
    if (!advice) {
      throw new Error("Gemini API returned no text");
    }

    return NextResponse.json({ advice, source: "gemini" });
  } catch (error) {
    console.error("[api/role-advice] Gemini call failed, using fallback", error);
    return NextResponse.json({ advice: fallbackRoleAdvice(input), source: "fallback" });
  }
}
