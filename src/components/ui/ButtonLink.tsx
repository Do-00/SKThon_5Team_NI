import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-styles";
import { Icon } from "./icons";

type NextLinkProps = ComponentProps<typeof Link>;

export interface ButtonLinkProps extends Omit<NextLinkProps, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
}

function isExternalHref(href: NextLinkProps["href"]): boolean {
  if (typeof href !== "string") return false;
  return /^https?:\/\//.test(href) || href.startsWith("//");
}

/**
 * Semantic, button-styled navigation link. Server Component — it renders
 * `next/link` (already a Client Component internally) rather than owning
 * any state itself, so it can be dropped into a Server Component tree
 * without pulling anything else into the client bundle.
 *
 * External `href`s (`http(s)://…`) automatically get
 * `target="_blank" rel="noopener noreferrer"` and a trailing
 * external-link icon unless overridden.
 */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  leadingIcon,
  trailingIcon,
  children,
  href,
  target,
  rel,
  ...props
}: ButtonLinkProps) {
  const external = isExternalHref(href);
  const resolvedTarget = target ?? (external ? "_blank" : undefined);
  const resolvedRel = rel ?? (external ? "noopener noreferrer" : undefined);

  return (
    <Link
      href={href}
      target={resolvedTarget}
      rel={resolvedRel}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {leadingIcon}
      <span>{children}</span>
      {trailingIcon ?? (external ? <Icon name="external-link" size={16} /> : null)}
    </Link>
  );
}
