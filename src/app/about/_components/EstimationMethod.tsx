import { Card, Icon } from "@/src/components/ui";
import type { IconName } from "@/src/components/ui";

/**
 * 서비스 소개 — 등급 추정 알고리즘.
 *
 * 이 화면이 말해야 하는 것은 "우리 모델이 좋다" 가 아니라
 * **"어디까지 말할 수 있고 어디부터는 말하지 않는지"** 입니다.
 * 서울 아파트 2,888개 중 1,390개(48%)에 대해 저희는 등급을 내지 않는데,
 * 그 판단 근거를 숫자로 공개하는 것이 이 서비스의 핵심 주장입니다.
 *
 * 여기 적힌 수치는 전부 실제 값이며 /api/apt/model 에서 그대로 확인할 수 있습니다.
 * 값이 바뀌면 이 파일도 같이 고쳐야 합니다 — 화면과 API 가 다른 숫자를 말하면 안 됩니다.
 */

interface Step {
  no: string;
  icon: IconName;
  title: string;
  body: string;
  note?: string;
}

const STEPS: Step[] = [
  {
    no: "01",
    icon: "search",
    title: "단지를 찾습니다",
    body: "서울 아파트 2,888개 단지의 준공연도·세대수·동수·연면적·복도유형·난방방식·건설사를 공공데이터에서 가져옵니다.",
    note: "서울시 공동주택(K-apt) 정보",
  },
  {
    no: "02",
    icon: "badge-check",
    title: "인증 이력이 있으면 거기서 끝입니다",
    body: "한국에너지공단 인증 실적에 기록이 있으면 추정하지 않고 실제 인증값을 그대로 보여드립니다.",
    note: "2,888개 중 324개 (11.2%)",
  },
  {
    no: "03",
    icon: "gauge",
    title: "없으면 모델이 예측합니다",
    body: "인증받은 단지 324개로 학습한 모델이 8개 항목을 보고 1차에너지소요량을 예측합니다. 전체 평균에서 시작해 결정트리 200개가 오차를 조금씩 깎아 나가는 방식입니다.",
    note: "GradientBoosting · 5-fold 교차검증",
  },
  {
    no: "04",
    icon: "triangle-alert",
    title: "예측했다고 바로 말하지는 않습니다",
    body: "준공 시기별로 모델의 오차를 따로 측정해 둡니다. 그 오차가 등급 한 칸의 폭(30~40 kWh/m²·yr)보다 크면 등급을 말할 자격이 없다고 보고 추정을 중단합니다.",
    note: "이 판단으로 1,390개 단지가 추정에서 제외됩니다",
  },
];

interface Factor {
  label: string;
  weight: number;
  reason: string;
}

/** /api/apt/model 의 featureImportance 를 묶은 값입니다 (model/train.py 로 생성, 반올림). */
const FACTORS: Factor[] = [
  { label: "동수 · 연면적 · 세대당 면적", weight: 64, reason: "외벽이 얼마나 넓은가. 같은 세대수라도 여러 동에 흩어질수록 열이 빠져나갈 면이 많아집니다" },
  { label: "난방 방식", weight: 17, reason: "지역난방은 열병합 폐열을 쓰기 때문에 개별 가스보일러보다 1차에너지 환산에서 유리합니다" },
  { label: "준공 연도 · 단열기준 시기", weight: 11, reason: "준공 시점에 적용된 법정 단열 기준이 성능의 하한을 정합니다" },
  { label: "세대수", weight: 6, reason: "단지 규모에 따라 공용부 비중이 달라집니다" },
  { label: "복도 유형", weight: 2, reason: "복도식은 외기에 닿는 면이 많아 계단식보다 불리합니다" },
];

interface Outcome {
  tone: "measured" | "point" | "range" | "refuse";
  label: string;
  count: number;
  desc: string;
}

const OUTCOMES: Outcome[] = [
  { tone: "measured", label: "인증값", count: 324, desc: "추정하지 않습니다. 인증 실적의 실제 값입니다" },
  { tone: "point", label: "등급 확정", count: 198, desc: "오차가 등급 한 칸보다 작아 등급을 제시합니다. ± 오차를 함께 표시합니다" },
  { tone: "range", label: "범위만", count: 976, desc: "특정 등급으로 단정하지 않고 «2~4등급» 처럼 범위로만 알려드립니다" },
  { tone: "refuse", label: "추정 안 함", count: 1390, desc: "비교할 인증 사례가 부족합니다. 등급 대신 확인된 사실만 보여드립니다" },
];

const OUTCOME_STYLE: Record<Outcome["tone"], string> = {
  measured: "border-[var(--teal-300)] bg-[var(--teal-50)] text-[var(--teal-800)]",
  point: "border-[var(--celadon-400)] bg-[var(--surface-accent-soft)] text-[var(--celadon-700)]",
  range: "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-body)]",
  refuse: "border-[var(--status-warn)] bg-[var(--status-warn-soft)] text-[var(--status-warn)]",
};

export function EstimationMethod() {
  const total = OUTCOMES.reduce((s, o) => s + o.count, 0);

  return (
    <section
      id="estimation-method"
      aria-label="등급 추정 알고리즘"
      className="flex scroll-mt-[calc(var(--app-bar-height)+var(--space-6))] flex-col gap-[var(--space-6)]"
    >
      {/* ── 도입: 문제 규모 ───────────────────────────────── */}
      <div className="flex flex-col gap-[var(--space-3)]">
        <h2 className="font-sans text-[26px] font-bold tracking-normal text-[var(--text-strong)]">
          서울 아파트는 더 정밀하게: 추정 모델
        </h2>
        <p className="text-[19px] leading-[1.7] text-[var(--text-body)]">
          서울 아파트{" "}
          <strong className="font-bold text-[var(--text-strong)]">2,888개 단지</strong> 가운데 에너지효율등급
          인증 이력이 있는 곳은{" "}
          <strong className="font-bold text-[var(--text-strong)]">324개(11.2%)</strong>뿐입니다. 나머지
          2,564개는 우리 집이 어느 수준인지 확인할 방법이 없습니다.
        </p>
      </div>

      {/* ── 4단계 ────────────────────────────────────────── */}
      <ol className="flex flex-col gap-[var(--space-3)]">
        {STEPS.map((s) => (
          <li key={s.no}>
            <Card className="flex h-full items-start gap-[var(--space-4)]">
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-brand-soft)] font-sans text-[17px] font-bold text-[var(--teal-700)]"
              >
                {s.no}
              </span>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Icon name={s.icon} size={20} className="shrink-0 text-[var(--teal-600)]" />
                  <h3 className="font-sans text-[18px] font-bold tracking-normal text-[var(--text-strong)]">
                    {s.title}
                  </h3>
                </div>
                <p className="text-[17px] leading-[1.65] text-[var(--text-body)]">{s.body}</p>
                {s.note ? (
                  <p className="text-[17px] leading-[1.5]text-[var(--text-muted)]">{s.note}</p>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ol>

      {/* ── 무엇을 보고 판단하는가 ─────────────────────────── */}
      <Card padding="lg" className="flex flex-col gap-[var(--space-4)]">
        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-[20px] font-bold tracking-normal text-[var(--text-strong)]">
            모델이 무엇을 보는가
          </h3>
          <p className="text-[17px] leading-[1.6] text-[var(--text-muted)]">
            학습된 모델이 실제로 각 항목에 둔 비중입니다. 사람이 정한 가중치가 아니라 데이터에서 측정된 값입니다.
          </p>
        </div>

        <ul className="flex flex-col gap-[var(--space-4)]">
          {FACTORS.map((f) => (
            <li key={f.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[17px] font-bold text-[var(--text-strong)]">{f.label}</span>
                <span className="shrink-0 text-[17px] font-bold tabular-nums text-[var(--teal-700)]">
                  {f.weight}%
                </span>
              </div>
              <span
                aria-hidden
                className="block h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--surface-sunken)]"
              >
                <span
                  className="block h-full rounded-[var(--radius-pill)] bg-[var(--teal-600)]"
                  style={{ width: `${f.weight}%` }}
                />
              </span>
              <p className="text-[17px] leading-[1.55] text-[var(--text-muted)]">{f.reason}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── 결과는 네 갈래 ────────────────────────────────── */}
      <Card padding="lg" className="flex flex-col gap-[var(--space-4)]">
        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-[20px] font-bold tracking-normal text-[var(--text-strong)]">
            결과는 네 갈래로 나뉩니다
          </h3>
          <p className="text-[17px] leading-[1.6] text-[var(--text-muted)]">
            모든 단지에 등급을 붙이지 않습니다. 근거가 부족하면 부족하다고 말합니다.
          </p>
        </div>

        {/* 비율 막대 */}
        <div
          aria-hidden
          className="flex h-3 w-full overflow-hidden rounded-[var(--radius-pill)]"
        >
          {OUTCOMES.map((o) => (
            <span
              key={o.tone}
              className={
                o.tone === "measured"
                  ? "bg-[var(--teal-700)]"
                  : o.tone === "point"
                    ? "bg-[var(--celadon-600)]"
                    : o.tone === "range"
                      ? "bg-[var(--teal-300)]"
                      : "bg-[var(--status-warn)]"
              }
              style={{ width: `${(o.count / total) * 100}%` }}
            />
          ))}
        </div>

        <ul className="grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-2">
          {OUTCOMES.map((o) => (
            <li
              key={o.tone}
              className={`flex flex-col gap-1.5 rounded-[var(--radius-md)] border p-4 ${OUTCOME_STYLE[o.tone]}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[17px] font-bold">{o.label}</span>
                <span className="text-[17px] font-bold tabular-nums">
                  {o.count.toLocaleString("ko-KR")}개
                </span>
              </div>
              <p className="text-[17px] leading-[1.55] text-[var(--text-body)]">{o.desc}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── 성능 공개 ─────────────────────────────────────── */}
      <Card tone="brand" padding="lg" className="flex flex-col gap-[var(--space-4)]">
        <div className="flex items-start gap-[var(--space-3)]">
          <Icon name="trending-down" size={26} className="shrink-0 text-[var(--teal-700)]" />
          <div className="flex flex-col gap-1">
            <h3 className="font-sans text-[20px] font-bold tracking-normal text-[var(--text-strong)]">
              모델 성능을 공개합니다
            </h3>
            <p className="text-[17px] leading-[1.6] text-[var(--text-body)]">
              학습에 쓰지 않은 데이터로 측정한 값입니다. 숨길 이유가 없다고 생각합니다.
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-[var(--space-4)] sm:grid-cols-4">
          {[
            { k: "평균 오차", v: "24.0", u: "kWh/m²·yr" },
            { k: "설명력 R²", v: "0.620", u: "" },
            { k: "학습 표본", v: "324", u: "개 단지" },
            { k: "추정 제외", v: "48", u: "%" },
          ].map((m) => (
            <div key={m.k} className="flex flex-col gap-0.5">
              <dt className="text-[17px] text-[var(--text-muted)]">{m.k}</dt>
              <dd className="font-sans text-[24px] font-bold tabular-nums text-[var(--teal-800)]">
                {m.v}
                {m.u ? (
                  <span className="ml-1 text-[15px] font-medium text-[var(--text-muted)]">{m.u}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>

        <p className="text-[17px] leading-[1.6] text-[var(--text-muted)]">
          비교 기준: 모델 없이 같은 단열기준 시기 단지들의 중앙값만 쓰면 평균 오차가 40.9입니다. 모델은 그보다 41% 정확합니다.
        </p>
      </Card>

      {/* ── 한계 ─────────────────────────────────────────── */}
      <Card tone="accent" padding="lg" className="flex items-start gap-[var(--space-4)]">
        <Icon name="info" size={28} className="shrink-0 text-[var(--celadon-700)]" />
        <div className="flex flex-col gap-2">
          <h3 className="font-sans text-[20px] font-bold tracking-normal text-[var(--text-strong)]">
            알고 있는 한계
          </h3>
          <p className="text-[17px] leading-[1.7] text-[var(--text-body)]">
            학습에 쓴 인증 사례가 신축에 몰려 있습니다. 1987년 단열기준 시기 아파트는 서울에 1,088개인데 인증받은
            곳이 23개뿐이라, 이 시기 단지는 대부분 추정하지 않습니다. 정작 도움이 필요한 노후 아파트에 데이터가
            없다는 것이 저희가 확인한 가장 큰 문제입니다.
          </p>
          <p className="text-[17px] leading-[1.7] text-[var(--text-body)]">
            또한 에너지효율등급은 표준 사용조건을 가정한 <strong className="font-bold">건물 자체의 성능</strong>
            이고, 실제 난방비는 여기에 거주 방식이 곱해진 결과입니다. 두 가지는 같지 않습니다.
          </p>
        </div>
      </Card>
    </section>
  );
}
