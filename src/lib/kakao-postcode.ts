/**
 * Typed wrapper around the Kakao(Daum) 우편번호 서비스 popup
 * (https://postcode.map.kakao.com/guide). Browser-only: the script adds
 * `window.kakao.Postcode`, which opens an address-search popup and reports
 * the picked address through `oncomplete`.
 */

const POSTCODE_SCRIPT_SRC = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

/** `"R"` = 도로명, `"J"` = 지번. */
export type KakaoAddressType = "R" | "J";

/** Subset of the `oncomplete` payload this app reads — see the guide's 「주소 정보」 table for the full list. */
export interface KakaoPostcodeData {
  /** 5-digit 국가기초구역번호 (new postal code). */
  zonecode: string;
  /** Default address for the result row the user clicked. */
  address: string;
  addressType: KakaoAddressType;
  /** Which of road/jibun the user actually clicked on. */
  userSelectedType: KakaoAddressType;
  roadAddress: string;
  jibunAddress: string;
  /** Road address the service matched when the user picked a jibun-only row (may be empty). */
  autoRoadAddress: string;
  /** Jibun address the service matched when the user picked a road-only row (may be empty). */
  autoJibunAddress: string;
  buildingCode: string;
  buildingName: string;
  apartment: "Y" | "N";
  sido: string;
  sigungu: string;
  /** 법정동/법정리 name, e.g. `"상암동"`. */
  bname: string;
  /** 법정동코드 10자리 (시군구 5 + 읍면동 5). 건축물대장 조회 키. */
  bcode?: string;
  /** 시군구코드 5자리. */
  sigunguCode?: string;
  roadname: string;
  /** What the user typed into the popup's search box. */
  query: string;
}

export type KakaoPostcodeCloseState = "FORCE_CLOSE" | "COMPLETE_CLOSE";

interface KakaoPostcodeOptions {
  oncomplete: (data: KakaoPostcodeData) => void;
  onclose?: (state: KakaoPostcodeCloseState) => void;
  width?: string | number;
  height?: string | number;
}

interface KakaoPostcodeEmbedOptions {
  /** Pre-fills the search box. */
  q?: string;
  /** Removes the embedded iframe after a pick. Defaults to true. */
  autoClose?: boolean;
}

interface KakaoPostcode {
  open(options?: KakaoPostcodeEmbedOptions): void;
  embed(element: HTMLElement, options?: KakaoPostcodeEmbedOptions): void;
}

declare global {
  interface Window {
    kakao?: {
      Postcode?: new (options: KakaoPostcodeOptions) => KakaoPostcode;
      /** Kakao Maps SDK, loaded separately by `DistrictMap.tsx` — out of this module's scope, left untyped. */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      maps?: any;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Injects the postcode script once and resolves when `window.kakao.Postcode` is available. */
export function loadKakaoPostcode(): Promise<void> {
  if (window.kakao?.Postcode) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = POSTCODE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.Postcode) {
        resolve();
      } else {
        reject(new Error("카카오 우편번호 스크립트가 kakao.Postcode를 제공하지 않습니다."));
      }
    };
    script.onerror = () => {
      // Let the next call retry instead of caching the failure forever.
      scriptPromise = null;
      script.remove();
      reject(new Error("카카오 우편번호 스크립트를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Renders the address search into `element` (the guide's 「레이어」 mode) and
 * calls `onComplete` with the picked address. Used instead of `.open()`'s
 * popup window, which popup blockers, in-app webviews (카카오톡 등), and
 * mobile browsers often suppress. Call after `loadKakaoPostcode()` resolves.
 */
export function embedKakaoPostcode(
  element: HTMLElement,
  onComplete: (data: KakaoPostcodeData) => void,
  options?: KakaoPostcodeEmbedOptions,
): void {
  const Postcode = window.kakao?.Postcode;
  if (!Postcode) {
    throw new Error("embedKakaoPostcode() called before loadKakaoPostcode() resolved.");
  }
  new Postcode({ oncomplete: onComplete, width: "100%", height: "100%" }).embed(element, options);
}

/** The address line for the row the user clicked (도로명 or 지번), as the guide's examples compose it. */
export function toSelectedAddress(data: KakaoPostcodeData): string {
  return data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
}
