import { NextResponse } from "next/server";
import { simulateWhatIf } from "@/src/lib/beec-client";

/** Thin proxy to beec's real `/api/simulate` (see `beec/.../SimulationController.java`). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseEnergy = Number(searchParams.get("baseEnergy"));
  const measures = searchParams.get("measures") ?? "";
  const purpose = searchParams.get("purpose") ?? "주거용";

  if (!baseEnergy || Number.isNaN(baseEnergy)) {
    return NextResponse.json({ found: false, message: "baseEnergy가 필요합니다." }, { status: 400 });
  }

  try {
    const measureCodes = measures ? measures.split(",") : [];
    const result = await simulateWhatIf(baseEnergy, measureCodes, purpose);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/simulate] beec call failed", error);
    return NextResponse.json({ found: false, message: "시뮬레이터 서버에 연결할 수 없어요." }, { status: 502 });
  }
}
