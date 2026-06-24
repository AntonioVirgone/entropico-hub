"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, LogOut } from "lucide-react";

import { NAV_ITEMS, isNavItemActive } from "@/lib/nav";
import { signOut } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import { GithubSetupDialog } from "@/components/github-setup-dialog";

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex items-center gap-2.5 border-b px-5 py-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          E
        </span>
        <Link href="/" className="text-base font-semibold tracking-tight">
          Entropico Hub
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <GithubSetupDialog
          trigger={
            <button
              type="button"
              className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <GitBranch className="h-4 w-4 shrink-0" />
              Guida GitHub
            </button>
          }
        />
        <p className="truncate px-3 pb-2 text-xs text-muted-foreground" title={userEmail}>
          {userEmail}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Esci
          </button>
        </form>
      </div>
    </aside>
  );
}
