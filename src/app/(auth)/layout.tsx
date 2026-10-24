import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Shared shell for the `(auth)` route group — centers the login/signup card
 * and keeps the "this is a prototype" disclosure in one place instead of
 * repeating it on every screen. Not a root layout: it nests inside
 * `src/app/layout.tsx`, which already provides `<html>`/`<body>`.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-1 flex-col items-center justify-center gap-[var(--space-8)] bg-[var(--surface-page)] px-[var(--gutter-screen)] py-[var(--space-12)]">
      <Link
        href="/"
        className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-sm)]"
        aria-label="에코체크 홈으로 이동"
      >
        <span className="eco-heading text-[var(--text-strong)]">에코체크</span>
      </Link>

      <div className="w-full max-w-[420px]">{children}</div>

      <p className="max-w-[360px] text-center text-[length:var(--text-caption-size)] leading-[var(--text-caption-lh)] text-[var(--text-muted)]">
        이 화면은 프로토타입이에요. 실제 계정을 생성하거나 인증하지 않아요.
      </p>
    </div>
  );
}
