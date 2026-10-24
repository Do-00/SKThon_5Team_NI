"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { encodeAddressId } from "@/src/lib/address-id";
import { withApartmentChecklistParams, type ApartmentChecklistAnswers } from "@/src/lib/apartment-checklist";
import { matchPostcodeAddress, toJibunAddress } from "@/src/lib/eco-api";
import { toSelectedAddress, type KakaoPostcodeData } from "@/src/lib/kakao-postcode";
import { rememberLastSearch, searchHref } from "@/src/lib/last-search";
import { encodeBuildingId, parcelFromPostcode } from "@/src/lib/building-id";

export type LookupStatus = "idle" | "loading" | "error";

/**
 * Shared by the home hero and `/search`: after a Kakao 우편번호 pick, checks
 * beec's `/api/match` and moves on — to the report (`/report/addr-…`) on a
 * hit, to the Seoul apartment search for 서울 아파트, and otherwise to the
 * 건축물대장-based report (`/report/bld-…`) that covers every building nationwide.
 */
export function useAddressLookup() {
  const router = useRouter();
  const [picked, setPicked] = useState<KakaoPostcodeData | null>(null);
  const [status, setStatus] = useState<LookupStatus>("idle");
  // Ignores responses for an address the user has since replaced.
  const latestRequest = useRef(0);

  const address = picked ? toSelectedAddress(picked) : "";

  async function handleSelect(data: KakaoPostcodeData, checklist: ApartmentChecklistAnswers) {
    const requestId = ++latestRequest.current;
    setPicked(data);
    setStatus("loading");
    // beec keys its match on the 지번 address, so that's what goes into the URL and the nav's "last search".
    const jibunAddress = toJibunAddress(data) || toSelectedAddress(data);

    try {
      const match = await matchPostcodeAddress(data);
      if (requestId !== latestRequest.current) return;

      rememberLastSearch(jibunAddress);
      if (match.found) {
        // The 건물명 rides inside the id, so the report and the guide resolve the same building on multi-building lots.
        // 체크리스트 답변(준공연도·건설사·난방방식)은 쿼리스트링으로 실어 보낸다 —
        // beec가 아직 이 값들을 못 받아서, 성적표 페이지가 참고용으로만 보여준다.
        router.push(withApartmentChecklistParams(`/report/${encodeAddressId(jibunAddress, data.buildingName)}`, checklist));
      } else if (data.apartment === "Y" && data.sido.startsWith("서울")) {
        // 서울 아파트는 단지 단위 모델이 있다 — 아파트 API는 지번을 모르고 이름/도로명으로만 찾으니, 건물명·도로명도 같이 넘긴다.
        router.push(searchHref(jibunAddress, data.buildingName, data.roadAddress));
      } else {
        // 그 밖의 모든 건축물(전국)은 건축물대장으로 찾는다. 법정동코드가 없으면 예전 검색 화면으로.
        const parcel = parcelFromPostcode(data);
        router.push(
          parcel
            ? withApartmentChecklistParams(`/report/${encodeBuildingId(parcel)}`, checklist)
            : searchHref(jibunAddress, data.buildingName, data.roadAddress),
        );
      }
    } catch {
      if (requestId === latestRequest.current) setStatus("error");
    }
  }

  return { picked, address, status, handleSelect };
}
