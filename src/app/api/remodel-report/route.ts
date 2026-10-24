import { NextResponse } from "next/server";
import { simulateWhatIf } from "@/src/lib/beec-client";
import {
  REMODEL_MEASURES,
  REMODEL_REPORT_SCHEMA,
  acceptGeminiRemodelReport,
  buildRemodelReportPrompt,
  completeReference,
  computeLocalReference,
  currentStateOf,
  fallbackRemodelReport,
  type RemodelReference,
  type RemodelReportInput,
} from "@/src/lib/remodel-report";
import { mapSimulateResponse, toSimulatePurpose } from "@/src/lib/what-if";

/**
 * Gemini 리모델링 리포트 — Gemini Flash를 서버에서만 호출하는 라우트 핸들러.
 *
 * `GEMINI_API_KEY`는 `NEXT_PUBLIC_` 접두어가 없으므로 클라이언트 번들에
 * 노출되지 않는다. 키가 없거나 호출·검증이 실패하면 참고값으로 쓴 규칙 기반
 * 리포트(`source: "fallback"`)를 돌려준다.
 */

// gemini-2.0-flash 는 서비스 종료(404). 3.6-flash 는 한 번에 50초 이상 걸리고 과부하(503)가
// 잦아서, 사고를 최소로 둔 3.5-flash(약 2초)를 쓴다.
const GEMINI_MODELS = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.7-flash,gemini-3.5-flash,gemini-3.6-flash,gemini-3-flash-preview")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const geminiEndpoint = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
/** 이 시간 안에 답이 없으면 규칙 기반 리포트로 넘어간다 — 카드가 스켈레톤으로 오래 멈춰 있지 않게. */
const GEMINI_TIMEOUT_MS = 60_000;

/**
 * 6가지 항목 적용 결과를 beec `/api/simulate`로 계산한다. 실제 소요량이 없거나
 * (통계 추정 구간 중간값·추정 보류) beec가 없으면 같은 절감률의 로컬 계산을 쓴다.
 */
async function computeReference(input: RemodelReportInput): Promise<RemodelReference> {
  const current = currentStateOf(input);
  const local = computeLocalReference(current);
  if (current.basis !== "data" || current.energy === null) return local;

  try {
    const result = await simulateWhatIf(
      current.energy,
      REMODEL_MEASURES.map((measure) => measure.code),
      toSimulatePurpose(input.useType),
    );
    const mapped = mapSimulateResponse(result, 0, input.grade);
    if (!mapped) return local;
    return completeReference(current, {
      reductionPercent: mapped.reductionPercent,
      projectedPrimaryEnergyKwh: mapped.projectedPrimaryEnergyKwh,
      projectedGrade: mapped.projectedGrade,
      basis: "beec",
    });
  } catch {
    return local;
  }
}

export async function POST(request: Request) {
  const input = (await request.json()) as RemodelReportInput;
  const reference = await computeReference(input);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ...fallbackRemodelReport(input, reference), fallbackReason: "GEMINI_API_KEY 없음" });
  }

  try {
    // 과부하(503)·호출 제한(429)은 잠깐 뒤 다시 하면 대개 풀린다 — 두 번까지 다시 시도한다.
    const body = JSON.stringify({
        contents: [{ parts: [{ text: buildRemodelReportPrompt(input, reference) }] }],
        generationConfig: {
          // 현재 소요량 추정까지 맡기므로 오래 생각하게 둔다. 사고 토큰도 이 한도에서 빠져서 넉넉히.
          maxOutputTokens: 16384,
          thinkingConfig: { thinkingLevel: "high" },
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: REMODEL_REPORT_SCHEMA,
        },
      });
    let res!: Response;
    for (const model of GEMINI_MODELS) {
      for (const delay of [0, 800]) {
        if (delay) await new Promise((r) => setTimeout(r, delay));
        res = await fetch(`${geminiEndpoint(model)}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
          body,
        });
        if (res.ok || ![503].includes(res.status)) break;
        await res.body?.cancel();
      }
      if (res.ok || ![429, 404, 503].includes(res.status)) break;
      console.warn(`[api/remodel-report] ${model} → ${res.status}, 다음 모델로 넘어갑니다`);
    }

    if (!res.ok) {
      // Google 쪽 에러 본문에는 키가 들어 있지 않다 — 사유 확인용으로 앞부분만 남긴다.
      throw new Error(`Gemini API error: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }

    const json = await res.json();
    // 사고를 켜면 parts 가 여러 조각으로 올 수 있다 — 사고 조각을 빼고 텍스트를 이어 붙인다.
    const parts: { text?: string; thought?: boolean }[] = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    if (!text) {
      throw new Error(`Gemini API returned no text (finishReason ${json?.candidates?.[0]?.finishReason ?? "?"})`);
    }

    const verdict = acceptGeminiRemodelReport(JSON.parse(text), reference);
    if ("reason" in verdict) {
      throw new Error(`Gemini answer rejected: ${verdict.reason}`);
    }
    return NextResponse.json(verdict.result);
  } catch (error) {
    console.error("[api/remodel-report] Gemini call failed, using fallback", error);
    const fallbackReason = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ...fallbackRemodelReport(input, reference), fallbackReason });
  }
}
