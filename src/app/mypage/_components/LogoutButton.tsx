"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon } from "../../../components/ui";

export interface LogoutButtonProps {
  className?: string;
}

/**
 * Client island — the only interactive piece of the 마이페이지 chrome.
 *
 * Prototype behavior only: calls the existing mock `POST /api/logout`
 * handler (see `src/mocks/handlers.ts`) and then navigates to `/login`.
 * There is no real session — this does not read or clear any cookie, and
 * navigation happens regardless of whether the mock request succeeds, since
 * nothing here actually guards access.
 */
export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Prototype only — no real session to clean up, so a failed mock
      // request still lets the user proceed to the login screen.
    } finally {
      router.push("/login");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      fullWidth
      loading={loggingOut}
      leadingIcon={<Icon name="logout" size={16} />}
      onClick={handleLogout}
      className={className}
    >
      로그아웃
    </Button>
  );
}
