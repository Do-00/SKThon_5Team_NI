import { NextResponse } from "next/server";
import { estimateReport, type SizeBucket } from "@/src/lib/beec-client";

/**
 * Thin proxy to beec's `/api/report` (등급 추정 — used when `/api/match`
 * found no exact address match). Kept as a same-origin route so the client
 * form doesn't need beec's URL/CORS config hardcoded into it.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const purpose = searchParams.get("purpose");
  const region = searchParams.get("region");
  const sizeBucket = searchParams.get("sizeBucket") as SizeBucket | null;

  if (!purpose || !region || !sizeBucket) {
    return NextResponse.json(
      { found: false, message: "purpose, region, sizeBucket을 모두 입력해 주세요." },
      { status: 400 },
    );
  }

  try {
    const result = await estimateReport(purpose, region, sizeBucket);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/estimate-report] beec call failed", error);
    return NextResponse.json(
      { found: false, message: "추정 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
