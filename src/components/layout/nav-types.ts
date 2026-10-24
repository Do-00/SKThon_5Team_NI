/**
 * Shared navigation shapes used by `AppBar`, `MobileNav`, and `Sidebar`.
 */

export interface NavItem {
  label: string;
  href: string;
  /**
   * Marks this item as the current page. `AppBar`/`Sidebar` are Server
   * Components and can't read the route themselves, so callers should
   * compute this (e.g. from the active route segment) and pass it down.
   */
  active?: boolean;
}

export interface NavCta {
  label: string;
  href: string;
}
