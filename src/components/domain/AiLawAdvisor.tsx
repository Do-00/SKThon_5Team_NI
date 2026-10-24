"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Badge, Button, Card, Icon } from "@/src/components/ui";
import {
  EXAMPLE_QUESTIONS,
  measureTitle,
  type AdvisorAudience,
  type AdvisorBuilding,
  type AdvisorResponse,
} from "@/src/lib/law-advisor";

export interface AiLawAdvisorProps {
  building: AdvisorBuilding;
}

/** 리포트 카드와 같은 가독성 기준 — 본문 17px 이상. */
const BODY = "text-[17px] leading-relaxed text-[var(--text-body)]";
const MUTED = "text-[15px] leading-relaxed text-[var(--text-muted)]";

const TIER_TONE: Record<NonNullable<AdvisorResponse["subsidy"]>["tier"], "good" | "caution" | "neutral"> = {
  preferred: "good",
  general: "good",
  below: "caution",
};

/**
 * 검색형 AI 상담 카드 — 질문을 받으면 `/api/advisor` 가 법령·공고에서 근거를 찾고,
 * Gemini 가 그 근거만 인용해 답한다. 근거 조문은 원문 링크와 함께 보여 준다.
 * 지원 요건 판정과 최소 조합은 서버가 계산한 숫자를 그대로 쓴다.
 */
export function AiLawAdvisor({ building }: AiLawAdvisorProps) {
  const inputId = useId();
  const answerId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [question, setQuestion] = useState("");
  const [audience, setAudience] = useState<AdvisorAudience>("owner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdvisorResponse | null>(null);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setQuestion(q);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, building, audience }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setResult((await res.json()) as AdvisorResponse);
    } catch {
      setError("상담 답변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  const citationIndex = new Map(result?.citations.map((c, i) => [c.id, i + 1]) ?? []);

  return (
    <Card padding="lg" className="flex flex-col gap-[var(--space-5)]">
      <div className="flex items-start gap-[var(--space-4)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--teal-600)] text-white">
          <Icon name="sparkles" size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="eco-heading">AI 그린리모델링 상담</h2>
          <p className={MUTED}>
            궁금한 점을 물어보면 녹색건축물 조성 지원법 같은 법령과 지원사업 공고에서 근거를 찾아 답해요.
          </p>
        </div>
      </div>

      <fieldset className="flex flex-wrap items-center gap-[var(--space-2)]">
        <legend className="sr-only">질문하는 사람</legend>
        {(
          [
            ["owner", "소유주예요"],
            ["tenant", "세입자예요"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={audience === value ? "primary" : "secondary"}
            aria-pressed={audience === value}
            onClick={() => setAudience(value)}
          >
            {label}
          </Button>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-[var(--space-2)]" aria-label="예시 질문">
        {EXAMPLE_QUESTIONS.map((example) => (
          <Button key={example} size="sm" variant="outline" disabled={loading} onClick={() => void ask(example)}>
            {example}
          </Button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
          <label htmlFor={inputId} className="text-[16px] font-bold text-[var(--text-strong)]">
            직접 물어보기
          </label>
          <textarea
            id={inputId}
            ref={inputRef}
            rows={2}
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter 는 글자 확정이므로 전송하지 않는다.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(question);
              }
            }}
            placeholder="예: 이 건물은 어떤 공사를 하면 지원을 받을 수 있나요?"
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-card)] px-[var(--space-3)] py-[var(--space-2)] text-[17px] text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
          />
        </div>
        <Button type="submit" size="lg" loading={loading} disabled={!question.trim()}>
          질문하기
        </Button>
      </form>

      <div id={answerId} aria-live="polite" aria-busy={loading} className="flex flex-col gap-[var(--space-5)]">
        {loading ? <p className={MUTED}>법령과 공고에서 근거를 찾고 있어요…</p> : null}
        {error ? <p className="text-[17px] text-[var(--status-danger)]">{error}</p> : null}

        {result && !loading ? (
          <>
            <div className="flex flex-col gap-[var(--space-2)]">
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <Badge tone={result.source === "gemini" ? "good" : "neutral"}>
                  {result.source === "gemini" ? "Gemini · 근거 인용" : "규칙 기반 · 근거 검색"}
                </Badge>
                {result.lawAsOf ? (
                  <span className={MUTED}>법령 기준일 {result.lawAsOf.slice(0, 10)}</span>
                ) : null}
              </div>
              <p className={BODY}>{result.answer}</p>
            </div>

            {result.actions.length > 0 ? (
              <div className="flex flex-col gap-[var(--space-3)]">
                <h3 className="text-[17px] font-black text-[var(--text-strong)]">추천 조치</h3>
                <ul className="flex flex-col gap-[var(--space-2)]">
                  {result.actions.map((action) => (
                    <li
                      key={action.code}
                      className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-[var(--space-3)]"
                    >
                      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                        <span className="text-[17px] font-bold text-[var(--text-strong)]">{action.title}</span>
                        <Badge tone="brand">약 {action.reductionPct}% 절감</Badge>
                        {action.needs ? <Badge tone="caution">{action.needs}</Badge> : null}
                      </div>
                      {action.reason ? <p className={BODY}>{action.reason}</p> : null}
                      {action.citationIds.length > 0 ? (
                        <p className={MUTED}>
                          근거{" "}
                          {action.citationIds
                            .map((id) => citationIndex.get(id))
                            .filter(Boolean)
                            .map((n) => `[${n}]`)
                            .join(" ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.subsidy ? (
              <div className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-[var(--space-4)]">
                <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                  <span className="text-[17px] font-bold text-[var(--text-strong)]">
                    추천 조치를 모두 하면 약 {result.subsidy.reductionPercent}% 개선
                  </span>
                  <Badge tone={TIER_TONE[result.subsidy.tier]}>{result.subsidy.label}</Badge>
                </div>
                {result.minimalCombos.preferred ? (
                  <p className={MUTED}>
                    우대(30%) 기준에 닿는 가장 작은 조합: {result.minimalCombos.preferred.map(measureTitle).join(" + ")}
                  </p>
                ) : null}
                {result.minimalCombos.general ? (
                  <p className={MUTED}>
                    일반(20%) 기준에 닿는 가장 작은 조합: {result.minimalCombos.general.map(measureTitle).join(" + ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {result.citations.length > 0 ? (
              <div className="flex flex-col gap-[var(--space-2)]">
                <h3 className="text-[17px] font-black text-[var(--text-strong)]">근거</h3>
                <ol className="flex flex-col gap-[var(--space-2)]">
                  {result.citations.map((c, i) => (
                    <li key={c.id} className="flex flex-col gap-1">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[16px] font-bold text-[var(--teal-700)] underline-offset-2 hover:underline"
                      >
                        [{i + 1}] {c.source} {c.kind === "지원사업" ? `· ${c.article}` : c.article}
                        {c.title ? `(${c.title})` : ""}
                        <Icon name="external-link" size={14} />
                      </a>
                      {c.quoteVerified && c.quote ? (
                        <p className={MUTED}>
                          <span className="mr-1 rounded bg-[var(--teal-50,#e6f6f4)] px-1.5 py-0.5 text-[13px] font-bold text-[var(--teal-700)]">
                            원문 확인됨
                          </span>
                          “{c.quote}”
                        </p>
                      ) : (
                        <p className={MUTED}>
                          <span className="mr-1 text-[13px] font-bold">원문 앞부분</span>
                          {c.excerpt}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <p className="text-[14px] leading-relaxed text-[var(--text-muted)]">{result.caution}</p>
          </>
        ) : null}
      </div>
    </Card>
  );
}
