export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

let listeners: Array<() => void> = [];

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

/** Tema usato per il render lato server / prima del mount (nessun localStorage). */
export function getServerTheme(): ThemeMode {
  return "system";
}

/**
 * Store esterno minimale (per useSyncExternalStore) così più ThemeToggle
 * montati insieme restano sincronizzati senza setState dentro useEffect.
 */
export function subscribeTheme(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/** Applica il tema al DOM, lo persiste e notifica i toggle montati. */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (mode !== "system") root.classList.add(mode);
  window.localStorage.setItem(STORAGE_KEY, mode);
  listeners.forEach((listener) => listener());
}

/**
 * Script anti-flash da iniettare in <head> (eseguito sincrono durante il
 * parsing HTML, prima del primo paint). Vedi guida Next.js "preventing
 * flash before hydration": legge la preferenza salvata e applica la
 * classe corrispondente su <html> prima che React idrati.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY
)});if(t==="dark"||t==="light"){document.documentElement.classList.add(t)}}catch(e){}})();`;
