import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "회원가입",
  description: "에코체크 계정을 만들고 건물 에너지 리포트를 확인하세요.",
};

export default function SignupPage() {
  return (
    <>
      {/* Visually hidden page heading — the visible title lives on the card. */}
      <h1 className="sr-only">회원가입</h1>
      {/* `SignupForm` reads `?next=` via useSearchParams, which requires a Suspense boundary. */}
      <Suspense fallback={<SignupFormFallback />}>
        <SignupForm />
      </Suspense>
    </>
  );
}

function SignupFormFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-[560px] w-full animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]"
    />
  );
}
