/**
 * 전체 건축물 성적표의 id — 지번(필지) 하나를 가리킨다.
 *
 *   bld-<시군구코드 5자리><법정동코드 5자리>-<대지구분 0|1>-<번 4자리>-<지 4자리>[-<건축물대장 PK>]
 *
 * 건축물대장 API 와 건물에너지 사용량이 모두 이 다섯 값으로 건물을 찾기 때문에
 * 주소 문자열 대신 이 키를 URL 에 싣는다. 한 필지에 건물이 여럿이면 PK 로 하나를 고른다.
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 모듈을 쓰지 않는다.
 */
import type { KakaoPostcodeData } from "@/src/lib/kakao-postcode";

export const GENERAL_BUILDING_PREFIX = "bld-";

export interface ParcelKey {
  sigunguCd: string;
  bjdongCd: string;
  /** "0" 대지, "1" 산 */
  platGbCd: "0" | "1";
  bun: string;
  ji: string;
  /** 건축물대장 관리 PK — 같은 필지의 여러 건물 중 하나를 고를 때만. */
  pk?: string;
}

const pad4 = (n: string | number) => String(Number(n) || 0).padStart(4, "0");

export function encodeBuildingId(key: ParcelKey): string {
  const base = `${GENERAL_BUILDING_PREFIX}${key.sigunguCd}${key.bjdongCd}-${key.platGbCd}-${pad4(key.bun)}-${pad4(key.ji)}`;
  return key.pk ? `${base}-${key.pk}` : base;
}

export function decodeBuildingId(id: string): ParcelKey | null {
  const m = /^bld-(\d{5})(\d{5})-([01])-(\d{4})-(\d{4})(?:-(\d+))?$/.exec(id);
  if (!m) return null;
  return { sigunguCd: m[1], bjdongCd: m[2], platGbCd: m[3] as "0" | "1", bun: m[4], ji: m[5], pk: m[6] };
}

/**
 * 카카오 우편번호 결과 → 필지 키. 법정동코드(bcode 10자리)와 지번 주소 끝의 "번-지" 를 쓴다.
 * 도로명만 고른 경우에도 카카오가 채워 주는 autoJibunAddress 로 지번을 얻는다.
 */
export function parcelFromPostcode(data: KakaoPostcodeData): ParcelKey | null {
  const bcode = (data.bcode ?? "").trim();
  if (!/^\d{10}$/.test(bcode)) return null;
  const jibun = (data.jibunAddress || data.autoJibunAddress || "").trim();
  const m = /(산\s*)?(\d+)(?:-(\d+))?$/.exec(jibun);
  if (!m) return null;
  return {
    sigunguCd: bcode.slice(0, 5),
    bjdongCd: bcode.slice(5),
    platGbCd: m[1] ? "1" : "0",
    bun: pad4(m[2]),
    ji: pad4(m[3] ?? "0"),
  };
}
