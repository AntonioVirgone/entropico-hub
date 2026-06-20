"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import {
  applyTheme,
  getServerTheme,
  getStoredTheme,
  subscribeTheme,
  type ThemeMode,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Chiaro", icon: Sun },
  { value: "dark", label: "Scuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/**
 * Bottone ciclico chiaro → scuro → sistema. useSyncExternalStore legge da
 * localStorage: usa "system" per il render server/iniziale (in linea con
 * lo script anti-flash di layout.tsx) e si aggiorna da solo subito dopo
 * l'hydration, senza setState dentro useEffect.
 */
export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const mode = useSyncExternalStore(
    subscribeTheme,
    getStoredTheme,
    getServerTheme
  );

  function cycle() {
    const idx = MODES.findIndex((m) => m.value === mode);
    const next = MODES[(idx + 1) % MODES.length].value;
    applyTheme(next);
  }

  const current = MODES.find((m) => m.value === mode) ?? MODES[2];
  const Icon = current.icon;
  const label = `Tema: ${current.label}`;

  if (compact) {
    return (
      <button
        type="button"
        onClick={cycle}
        aria-label={`${label}. Clicca per cambiare.`}
        title={label}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label}. Clicca per cambiare.`}
      title={label}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
