import { LayoutDashboard, Lightbulb, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Voci del menu principale della web app. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/idee", label: "Backlog idee", icon: Lightbulb },
];

/** Una voce è attiva se il pathname coincide (home) o ne è un sotto-percorso. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
