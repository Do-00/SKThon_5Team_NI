"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button, Icon, Input, RadioGroup } from "@/src/components/ui";
import {
  HEATING_TYPE_OPTIONS,
  type ApartmentChecklistAnswers,
  type HeatingType,
} from "@/src/lib/apartment-checklist";
import { toSelectedAddress, type KakaoPostcodeData } from "@/src/lib/kakao-postcode";

export interface ApartmentChecklistStepProps {
  data: KakaoPostcodeData;
  onBack: () => void;
  onSubmit: (answers: ApartmentChecklistAnswers) => void;
}

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Second step of the home hero's address dialog, shown only after the user
 * picks an apartment (`data.apartment === "Y"`). Collects a few optional
 * details beec can't infer from the address alone — 준공연도·건설사(비슷한
 * 시기에 같은 건설사가 지은 단지는 자재가 비슷해 데이터가 없는 곳도 유추할 수
 * 있다는 아이디어)·난방방식. Nothing here is required; skipping fields is fine.
 */
export function ApartmentChecklistStep({ data, onBack, onSubmit }: ApartmentChecklistStepProps) {
  const [year, setYear] = useState("");
  const [builder, setBuilder] = useState("");
  /**
   * "아직 고르지 않음" 을 undefined 가 아니라 빈 문자열로 둡니다.
   *
   * undefined 를 RadioGroup 의 value 로 넘기면 처음에는 uncontrolled 로 동작하다가
   * 사용자가 하나를 고르는 순간 controlled 로 바뀝니다. React 가 콘솔에
   * "changing an uncontrolled input to be controlled" 경고를 냅니다.
   * 빈 문자열은 어느 option.value 와도 맞지 않아 "선택 없음" 화면은 그대로이면서,
   * 처음부터 끝까지 controlled 로 유지됩니다.
   */
  const [heatingType, setHeatingType] = useState<HeatingType | "">("");
  const yearId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedYear = Number(year);
    onSubmit({
      completionYear: year.trim() && Number.isFinite(parsedYear) ? parsedYear : null,
      builder,
      heatingType: heatingType || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-5)]">
      <div className="flex items-start gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] px-[var(--space-4)] py-[var(--space-3)]">
        <Icon name="map-pin" size={18} className="mt-[2px] shrink-0 text-[var(--text-muted)]" />
        <p className="text-[15px] leading-[1.5] break-keep text-[var(--text-body)]">{toSelectedAddress(data)}</p>
      </div>

      <div>
        <h3 className="eco-subhead text-[var(--text-strong)]">집 정보를 알려주시면 더 정확해져요</h3>
        <p className="mt-[var(--space-1)] text-[length:var(--text-caption-size)] text-[var(--text-muted)]">
          전부 선택 입력이에요. 비워두고 넘어가도 괜찮아요.
        </p>
      </div>

      <Input
        id={yearId}
        label="준공연도"
        type="number"
        inputMode="numeric"
        min={1970}
        max={CURRENT_YEAR}
        placeholder={`예: ${CURRENT_YEAR - 15}`}
        value={year}
        onChange={(event) => setYear(event.target.value)}
      />

      <Input
        label="건설사"
        type="text"
        placeholder="예: OO건설"
        hint="비슷한 시기에 지어진 같은 건설사 단지는 자재가 비슷해서, 공공 데이터가 없는 단지도 추정하는 데 참고가 돼요."
        value={builder}
        onChange={(event) => setBuilder(event.target.value)}
      />

      <RadioGroup
        legend="난방 방식"
        variant="card"
        value={heatingType}
        onValueChange={(value) => setHeatingType(value as HeatingType)}
        options={HEATING_TYPE_OPTIONS}
      />

      <div className="flex justify-between gap-[var(--space-3)]">
        <Button type="button" variant="ghost" onClick={onBack}>
          뒤로
        </Button>
        <Button type="submit" variant="primary" trailingIcon={<Icon name="arrow-right" size={20} />}>
          확인
        </Button>
      </div>
    </form>
  );
}
