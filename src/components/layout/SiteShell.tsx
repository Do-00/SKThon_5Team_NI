import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../ui/utils";
import { AppBar } from "./AppBar";
import { SiteFooter } from "./SiteFooter";

/** Page frame for every public page: sticky `AppBar`, the page's `<main>`, and `SiteFooter`. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--surface-page)]">
      <AppBar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Content-width section with the design's standard top spacing between stacked sections. */
export function PageSection({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("eco-container pt-[var(--space-12)]", className)} {...props} />;
}
