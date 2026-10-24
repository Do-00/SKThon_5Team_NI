"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Select } from "@/src/components/ui";
import { encodeEstimateId } from "@/src/lib/address-id";
import {
  REGION_OPTIONS,
  SIZE_BUCKET_OPTIONS,
  toGradeCode,
  type ReportEstimate,
  type SizeBucket,
} from "@/src/lib/beec-client";

/**
 * 이 서비스는 아파트(공동주택)만 다룹니다. 그래서 용도를 고르게 하지 않습니다.
 *
 * 예전에는 "주거용 / 주거용 이외" 를 선택하게 했는데, 백엔드가 아파트 한정으로 바뀌면서
 * 무엇을 고르든 주거용으로 계산합니다. 고를 수 있는데 반영되지 않는 입력은
 * 사용자를 속이는 것과 같아서 아예 없앴습니다.
 *
 * 값 자체는 계속 필요합니다 — 추정 리포트 주소(`/report/est-…`)에 들어가고
 * `/api/report` 요청에도 실려 나갑니다.
 */
const APARTMENT_PURPOSE = "주거용";

export interface EstimateFallbackFormProps {
  /** The address with no 실측 match — shown above the form, and the estimated report's title. */
  query: string;
}

type Status = "idle" | "loading" | "error";

/**
 * Step 3 of the plan's address-matching flow: when `/api/match` returns
 * `found:false`, the user picks 용도·지역·규모 and this checks `/api/report`
 * (via the `/api/estimate-report` relay) for a group-level estimated grade,
 * then opens it as a regular report (`/report/est-…`) so an estimate gets
 * the same layout as a 실측 match — there's no exact building, just a
 * statistical stand-in.
 */
export function EstimateFallbackForm({ query }: EstimateFallbackFormProps) {
  const router = useRouter();
  const purpose = APARTMENT_PURPOSE;
  const [region, setRegion] = useState(REGION_OPTIONS[0]);
  const [sizeBucket, setSizeBucket] = useState<SizeBucket>(SIZE_BUCKET_OPTIONS[0].value);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const params = new URLSearchParams({ purpose, region, sizeBucket });
      const res = await fetch(`/api/estimate-report?${params.toString()}`);
      const data = (await res.json()) as ReportEstimate;
      if (data.found && toGradeCode(data.estimatedGrade)) {
        // Stays "loading" until the report page takes over.
        router.push(`/report/${encodeEstimateId({ address: query, purpose, region, sizeBucket })}`);
        return;
      }
      setMessage(data.message ?? "해당 조건의 데이터가 없어요.");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card padding="lg" className="flex flex-col gap-[var(--space-5)]">
      <div className="flex flex-col gap-[var(--space-1)]">
        <h2 className="eco-heading">
          &lsquo;{query}&rsquo;에 대한 실측 데이터가 없어요
        </h2>
        <p className="text-[length:var(--text-body-size)] text-[var(--text-muted)]">
          지역과 단지 규모를 알려주시면 조건이 비슷한 아파트들의 인증 실적으로 등급을 추정해 드려요.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 sm:items-end"
      >
        <Select
          label="지역"
          options={REGION_OPTIONS.map((value) => ({ value, label: value }))}
          value={region}
          onChange={(event) => setRegion(event.target.value)}
        />
        <Select
          label="규모"
          options={[...SIZE_BUCKET_OPTIONS]}
          value={sizeBucket}
          onChange={(event) => setSizeBucket(event.target.value as SizeBucket)}
        />
        <Button type="submit" variant="primary" loading={status === "loading"} className="sm:col-span-2">
          등급 추정하기
        </Button>
      </form>

      {status === "error" ? (
        <p role="alert" className="text-[length:var(--text-body-size)] text-[var(--status-danger)]">
          추정 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}

      {message ? (
        <p className="border-t border-[var(--border-subtle)] pt-[var(--space-4)] text-[length:var(--text-body-size)] text-[var(--text-muted)]">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
