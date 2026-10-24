/** Route-level loading fallback for the `(auth)` group (login/signup/reset-password). */
export default function AuthLoading() {
  return (
    <div
      role="status"
      aria-label="불러오는 중"
      className="h-9 w-9 animate-spin rounded-[var(--radius-pill)] border-[var(--border-width-strong)] border-[var(--border-strong)] border-t-[var(--action-primary)]"
    />
  );
}
