import type { UserType } from "../data/account";

/** Korean display label for each applicant category. */
export const USER_TYPE_LABEL: Record<UserType, string> = {
  owner: "소유주",
  tenant: "임차인",
  hoa: "입주자대표회의",
  corporation: "법인",
  general: "일반",
};

const METRO_SUFFIX = /(특별시|광역시|특별자치시|특별자치도|도)$/;

/** Pulls the 시·군·구 token out of a Korean road address, e.g. `"서울특별시 마포구 월드컵로 120"` -> `"마포구"`. */
export function getDistrict(address: string): string | undefined {
  return address.split(/\s+/).find((token) => /[시군구]$/.test(token) && !METRO_SUFFIX.test(token));
}

/** Short "who is this matched for" hint, e.g. `"마포구 · 소유주 기준"`. */
export function describeAudience(address: string, userType: UserType): string {
  return [getDistrict(address), `${USER_TYPE_LABEL[userType]} 기준`].filter(Boolean).join(" · ");
}
