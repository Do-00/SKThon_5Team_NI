import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "로그인",
  description: "에코체크에 로그인하고 건물 에너지 리포트를 확인하세요.",
};

export default function LoginPage() {
  return (
    <>
      {/* Visually hidden page heading — the visible title lives on the card. */}
      <h1 className="sr-only">로그인</h1>
      {/* `LoginForm` reads `?next=` via useSearchParams, which requires a Suspense boundary. */}
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </>
  );
}

function LoginFormFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-[420px] w-full animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)]"
    />
  );
}
