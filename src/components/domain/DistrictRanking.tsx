"use client";

import { NO_DATA_COLOR, colorOfRank, type DistrictStat } from "@/src/lib/district-scale";

/**
 * 동네 비교 — 순위 막대.
 *
 * 지도의 대체재이자, 지도 아래에 같이 두어도 좋은 화면입니다.
 * "우리 동네가 252곳 중 몇 번째" 라는 문장은 지도보다 이쪽이 정확하게 전달합니다.
 *
 * 백엔드 /api/districts 가 이미 등급 좋은 순으로 정렬해 rank 를 붙여 보냅니다.
 * 여기서 다시 정렬하지 않습니다.
 */

interface Props {
  stats: DistrictStat[];
  /** 강조할 동네. 예: "강서구" */
  selected?: string;
  /** 상위 몇 개만 보일지. 내 동네는 범위 밖이어도 따로 붙여 보여줍니다. */
  limit?: number;
  note?: string;
  className?: string;
}

export function DistrictRanking({ stats, selected, limit, note, className }: Props) {
  if (stats.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4 text-[15px] text-[var(--text-muted)]">
        이 지역은 인증 사례가 충분하지 않아 비교할 수 없습니다.
      </p>
    );
  }

  const ranked = stats.filter((s) => !s.insufficient);
  const insufficient = stats.length - ranked.length;
  const maxSample = Math.max(1, ...ranked.map((s) => s.sampleCount));

  const mine = selected ? stats.find((s) => s.district === selected) : undefined;
  const shown = limit ? ranked.slice(0, limit) : ranked;
  const mineHidden = mine != null && !shown.some((s) => s.key === mine.key);

  return (
    <div className={className}>
      {note && <p className="mb-3 text-[14px] text-[var(--text-muted)]">{note}</p>}

      {mine && !mine.insufficient && (
        <p className="mb-4 text-[17px] leading-[1.6]">
          <strong className="font-bold">{mine.district}</strong>는 비교 가능한{" "}
          <strong className="font-bold">{ranked.length}곳</strong> 중{" "}
          <strong className="font-bold">{mine.rank}위</strong>입니다.{" "}
          <span className="text-[var(--text-muted)]">
            {mine.purpose} 인증 {mine.sampleCount}건 기준 {mine.grade}
          </span>
        </p>
      )}

      {mine && mine.insufficient && (
        <p className="mb-4 text-[17px] leading-[1.6]">
          <strong className="font-bold">{mine.district}</strong>는{" "}
          {mine.purpose} 인증 사례가 {mine.sampleCount}건뿐이라 순위를 매기지 않았습니다.{" "}
          <span className="text-[var(--text-muted)]">인증 사각지대에 해당합니다.</span>
        </p>
      )}

      <ol className="flex flex-col gap-1.5">
        {shown.map((s) => (
          <Row key={s.key} s={s} maxSample={maxSample} isMine={s.key === mine?.key} />
        ))}
        {mineHidden && mine && (
          <>
            <li className="py-1 text-center text-[13px] text-[var(--text-muted)]">…</li>
            <Row s={mine} maxSample={maxSample} isMine />
          </>
        )}
      </ol>

      {insufficient > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: NO_DATA_COLOR }}
          />
          인증 사례가 부족해 순위에서 제외한 지역 {insufficient}곳
        </p>
      )}
    </div>
  );
}

function Row({
  s,
  maxSample,
  isMine,
}: {
  s: DistrictStat;
  maxSample: number;
  isMine: boolean;
}) {
  // 막대 길이는 인증 건수. 등급은 색으로 읽습니다.
  const width = s.insufficient ? 3 : Math.max(4, Math.round((s.sampleCount / maxSample) * 100));

  return (
    <li
      className={[
        "grid grid-cols-[2.75rem_7.5rem_1fr_5rem] items-center gap-3 rounded-[var(--radius-sm)] px-2 py-1.5",
        isMine ? "bg-[var(--surface-brand-soft)] ring-1 ring-[var(--teal-700)]" : "",
      ].join(" ")}
    >
      <span className="text-right text-[14px] tabular-nums text-[var(--text-muted)]">
        {s.rank == null ? "—" : `${s.rank}위`}
      </span>

      <span className={["truncate text-[15px]", isMine ? "font-bold" : ""].join(" ")} title={s.key}>
        {s.district}
        <span className="ml-1 text-[12px] text-[var(--text-muted)]">{s.region}</span>
      </span>

      <span className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-brand-soft)]">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${width}%`,
            background: s.insufficient ? NO_DATA_COLOR : colorOfRank(s.gradeRank),
          }}
        />
      </span>

      <span className="text-right text-[14px] tabular-nums">
        <span className="font-semibold">{s.gradeCode ?? "—"}</span>
        <span className="ml-1 text-[12px] text-[var(--text-muted)]">{s.sampleCount}건</span>
      </span>
    </li>
  );
}
