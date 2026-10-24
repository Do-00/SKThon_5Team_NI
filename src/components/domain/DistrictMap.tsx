"use client";

/* eslint-disable @typescript-eslint/no-explicit-any --
 * 카카오 지도 SDK 는 타입 정의(@types)를 제공하지 않고 window.kakao 전역으로만
 * 노출됩니다. 지도·오버레이 인스턴스에 한해 any 를 허용합니다. 이 파일 밖으로는
 * 새어 나가지 않습니다 — 바깥에 주는 값은 전부 district-scale.ts 의 타입입니다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  NO_DATA_COLOR,
  colorOfRank,
  fetchDistricts,
  radiusOfSample,
  type DistrictCoord,
  type DistrictStat,
} from "@/src/lib/district-scale";
import { DistrictRanking } from "./DistrictRanking";

/**
 * ④ 동네 비교 지도.
 *
 * 카카오맵 위에 시군구마다 원을 하나씩 얹습니다. 색은 등급, 크기는 인증 건수입니다.
 * 마커 이미지를 쓰지 않아 에셋이 필요 없고, 250개를 올려도 가볍습니다.
 *
 * 인증 사례가 부족한 동네는 지우지 않고 회색으로 남깁니다.
 * 수도권은 촘촘하고 지방은 비어 있는 그림이 곧 이 서비스의 논점이기 때문입니다.
 *
 * 지도가 뜨지 않는 상황(키 없음·도메인 미등록·네트워크 차단)에서는
 * 자동으로 순위 막대로 내려갑니다. 화면이 비는 일은 없습니다.
 *
 * 필요한 것
 *   .env.local  →  NEXT_PUBLIC_KAKAO_MAP_KEY=카카오_JavaScript_키
 *   카카오 개발자센터 > 앱 설정 > 플랫폼 > Web 에 http://localhost:3000 등록
 */

// `window.kakao` is declared in `src/lib/kakao-postcode.ts` (shared with the Postcode SDK).

interface Props {
  /** "서울" 처럼 시도명. 생략하면 전국. */
  region?: string;
  /** 강조할 동네. 예: "강서구" */
  selected?: string;
  /** "주거용" | "주거용 이외" | "전체". 생략하면 백엔드 기본값(주거용). */
  purpose?: string;
  minSample?: number;
  coords: DistrictCoord[];
  className?: string;
}

const SDK_ID = "kakao-maps-sdk";

function loadKakaoSdk(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("서버에서는 실행되지 않습니다"));
    if (window.kakao?.maps) return resolve();

    const onReady = () => window.kakao!.maps.load(() => resolve());
    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () => reject(new Error("카카오 SDK 로드 실패")), { once: true });
      return;
    }

    const s = document.createElement("script");
    s.id = SDK_ID;
    s.async = true;
    // autoload=false 로 받아두고 kakao.maps.load 로 직접 초기화합니다.
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    s.onload = onReady;
    s.onerror = () => reject(new Error("카카오 SDK 로드 실패"));
    document.head.appendChild(s);
  });
}

export function DistrictMap({
  region,
  selected,
  purpose,
  minSample = 5,
  coords,
  className,
}: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const overlaysRef = useRef<any[]>([]);

  /**
   * 지도 인스턴스의 단일 소유자.
   *
   * setMap(prev => prev ?? new kakao.maps.Map(...)) 처럼 updater 안에서 지도를
   * 만들면 안 됩니다. StrictMode 는 updater 를 두 번 호출하고 이펙트도 두 번
   * 돌리는데, `new Map(div)` 은 DOM 을 건드리는 부수효과라 같은 div 에 지도가
   * 두 번 만들어집니다. 나중에 만들어진 쪽이 실제 DOM 을 차지하고, state 에는
   * 버려진 인스턴스가 남을 수 있습니다. 그러면 오버레이(setMap)와 setBounds 가
   * 화면에 없는 지도로 가서 — 원이 하나도 안 보이고 시점도 기본값(평양·다롄)에
   * 머뭅니다. 실제로 그 증상이 났습니다.
   *
   * 생성은 이펙트 본문에서 ref 로 한 번만. state 에는 만들어진 값만 넣습니다.
   */
  const mapInstanceRef = useRef<any>(null);

  /**
   * 만들어진 지도를 state 에도 둡니다(소유는 위 ref, 알림은 이 state).
   *
   * ref 에 넣으면 지도가 만들어져도 리렌더가 일어나지 않습니다. 카카오 SDK 는
   * 네트워크에서 받아오는 것이라 거의 항상 /api/districts 응답보다 늦게 준비되는데,
   * 그러면 "원 그리기" 이펙트가 데이터만 보고 한 번 돌 때 지도는 아직 null 이고,
   * 그 뒤로는 다시 돌 이유가 없어서 원이 영영 안 그려집니다.
   * (지도는 기본 중심·기본 레벨 그대로 남아 평양·다롄이 보이는 그 화면이 됩니다.)
   *
   * state 로 두면 지도 생성이 곧 리렌더라서 이펙트가 다시 돌고, 둘 중 무엇이
   * 먼저 준비되든 순서와 무관하게 그려집니다.
   */
  const [map, setMap] = useState<any>(null);

  const [stats, setStats] = useState<DistrictStat[] | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  /** 좌표와 통계를 시군구 이름으로 조인합니다. */
  const joined = useMemo(() => {
    if (!stats) return [];
    const byKey = new Map(coords.map((c) => [c.key ?? `${c.region ?? ""} ${c.district}`.trim(), c]));
    const byName = new Map(coords.map((c) => [c.district, c]));
    return stats
      .map((s) => {
        const c = byKey.get(s.key) ?? byName.get(s.district);
        return c ? { ...s, lat: c.lat, lng: c.lng } : null;
      })
      .filter((x): x is DistrictStat & { lat: number; lng: number } => x !== null);
  }, [stats, coords]);

  // 1. 데이터
  useEffect(() => {
    let alive = true;
    fetchDistricts(region, purpose, minSample)
      .then((d) => alive && setStats(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [region, purpose, minSample]);

  // 2. 지도 생성
  useEffect(() => {
    // 키가 없으면 아무것도 하지 않습니다. 여기서 setState 를 부르면 이펙트가
    // 렌더를 한 번 더 유발합니다(react-hooks/set-state-in-effect). 키의 유무는
    // 렌더 중에 바로 알 수 있는 값이라 state 로 둘 이유가 없습니다 — 아래
    // 화면 분기에서 appKey 를 직접 봅니다.
    if (!appKey) return;
    let alive = true;
    loadKakaoSdk(appKey)
      .then(() => {
        const box = boxRef.current;
        if (!alive || !box) return;

        // 이미 만들어 둔 지도가 있으면 그대로 씁니다(StrictMode 재실행).
        // 단, 그 지도가 붙어 있던 div 가 지금 화면의 div 가 아니면(컴포넌트가
        // 실제로 언마운트됐다가 다시 붙은 경우) 버리고 새로 만듭니다.
        if (mapInstanceRef.current) {
          const attached = mapInstanceRef.current.getNode?.();
          if (!attached || attached === box || box.contains(attached)) {
            setMap(mapInstanceRef.current);
            return;
          }
          overlaysRef.current.forEach((o) => o.setMap(null));
          overlaysRef.current = [];
          mapInstanceRef.current = null;
        }

        const kakao = window.kakao;
        if (!kakao?.maps) return;

        const instance = new kakao.maps.Map(box, {
          center: new kakao.maps.LatLng(36.4, 127.9),
          level: region ? 9 : 13,
        });
        mapInstanceRef.current = instance;
        setMap(instance);
      })
      .catch(() => alive && setMapFailed(true));
    return () => {
      alive = false;
    };
  }, [appKey, region]);

  // 3. 원 그리기
  useEffect(() => {
    if (!map || joined.length === 0) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new window.kakao!.maps.LatLngBounds();

    // 표본이 부족한 동네를 먼저 그려서 뒤로 깔리게 합니다.
    const ordered = [...joined].sort(
      (a, b) => Number(b.insufficient) - Number(a.insufficient),
    );

    ordered.forEach((d) => {
      const pos = new window.kakao!.maps.LatLng(d.lat, d.lng);
      bounds.extend(pos);

      const isMine = selected != null && d.district === selected;
      const size = d.insufficient ? 12 : radiusOfSample(d.sampleCount);

      const el = document.createElement("div");
      el.style.cssText = [
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "border-radius:9999px",
        "font-size:11px",
        "font-weight:700",
        "color:#fff",
        "cursor:pointer",
        "user-select:none",
        `width:${size}px`,
        `height:${size}px`,
        `background:${d.insufficient ? NO_DATA_COLOR : colorOfRank(d.gradeRank)}`,
        `opacity:${d.insufficient ? 0.65 : isMine ? 1 : 0.82}`,
        isMine
          ? "border:3px solid #111;box-shadow:0 0 0 3px rgba(255,255,255,.95)"
          : "border:1px solid rgba(255,255,255,.7)",
        isMine ? "z-index:20" : d.insufficient ? "z-index:1" : "z-index:5",
      ].join(";");

      // 원이 작으면 글자가 안 들어갑니다. 표본 부족은 점으로만 둡니다.
      if (!d.insufficient && size >= 22) el.textContent = d.gradeCode ?? "";

      el.title = d.insufficient
        ? `${d.region} ${d.district} · 인증 사례 부족 (${d.purpose} ${d.sampleCount}건)`
        : `${d.region} ${d.district} · ${d.grade} · ${d.purpose} ${d.sampleCount}건 · ${d.rank}위`;

      const overlay = new window.kakao!.maps.CustomOverlay({
        position: pos,
        content: el,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    // relayout 을 먼저 불러야 합니다. 지도가 만들어질 때 이 div 는 아직 폭·높이가
    // 확정되지 않은 경우가 있고, 그 상태에서 setBounds 를 부르면 엉뚱한 배율로
    // 잡힙니다. 한 프레임 미뤄서 레이아웃이 끝난 뒤에 맞춥니다.
    if (!bounds.isEmpty()) {
      requestAnimationFrame(() => {
        map.relayout();
        map.setBounds(bounds, 40, 40, 40, 40);
      });
    }
  }, [map, joined, selected]);

  // ── 화면 ────────────────────────────────────────────

  if (error) {
    return (
      <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4 text-[15px] text-[var(--text-muted)]">
        {error} — 백엔드가 8080에 떠 있는지 확인해주세요.
      </p>
    );
  }

  const missingCoords = stats !== null && joined.length === 0;
  const noMap = mapFailed || !appKey;
  if (noMap || missingCoords) {
    return (
      <DistrictRanking
        stats={stats ?? []}
        selected={selected}
        limit={15}
        note={
          missingCoords
            ? "좌표 데이터가 없어 순위로 표시합니다."
            : !appKey
              ? "지도 키(NEXT_PUBLIC_KAKAO_MAP_KEY)가 없어 순위로 표시합니다."
              : "지도를 불러오지 못해 순위로 표시합니다."
        }
        className={className}
      />
    );
  }

  const ranked = joined.filter((d) => !d.insufficient).length;
  const gray = joined.length - ranked;

  return (
    <div className={className}>
      <div
        ref={boxRef}
        className="h-[440px] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
      />
      <Legend ranked={ranked} gray={gray} />
    </div>
  );
}

function Legend({ ranked, gray }: { ranked: number; gray: number }) {
  /**
   * 등급 10단계를 전부 적습니다.
   *
   * 예전에는 7개만 골라 찍었는데(1++·4·6 누락), 색 스케일은 10단계라서
   * 지도에 있는 색이 범례에 없는 상태가 됩니다. "1++는 어디 갔냐"는
   * 질문이 실제로 나왔습니다. 범례는 색을 읽는 표이니 빠짐이 없어야 합니다.
   * rank 는 district-scale.ts 의 SCALE 인덱스와 1:1 입니다.
   */
  const steps = [
    { code: "1+++", rank: 1 },
    { code: "1++", rank: 2 },
    { code: "1+", rank: 3 },
    { code: "1", rank: 4 },
    { code: "2", rank: 5 },
    { code: "3", rank: 6 },
    { code: "4", rank: 7 },
    { code: "5", rank: 8 },
    { code: "6", rank: 9 },
    { code: "7", rank: 10 },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--text-muted)]">
      <span className="flex items-center gap-2">
        {steps.map((s) => (
          <span key={s.code} className="flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: colorOfRank(s.rank) }}
            />
            {s.code}
          </span>
        ))}
      </span>
      <span className="flex items-center gap-1">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: NO_DATA_COLOR }}
        />
        인증 사례 부족 {gray}곳
      </span>
      <span>원 크기는 인증 건수 · 비교 가능 {ranked}곳</span>
    </div>
  );
}
