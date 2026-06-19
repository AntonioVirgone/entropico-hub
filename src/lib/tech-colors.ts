/**
 * Palette colori per stack tecnologico, in stile GitHub (linguist).
 * Le chiavi sono i nomi normalizzati (minuscolo, trim). Per i valori non noti
 * (es. tecnologie custom) si usa un colore di fallback per categoria.
 */
const TECH_COLORS: Record<string, string> = {
  // ── Linguaggi (palette GitHub linguist) ──
  typescript: "#3178c6",
  javascript: "#f1e05b",
  python: "#3572a5",
  go: "#00add8",
  rust: "#dea584",
  java: "#b07219",
  kotlin: "#a97bff",
  swift: "#f05138",
  php: "#4f5d95",
  ruby: "#701516",
  "c#": "#178600",
  dart: "#00b4ab",
  html: "#e34c26",
  css: "#563d7c",
  c: "#555555",
  "c++": "#f34b7d",
  shell: "#89e051",

  // ── Framework ──
  "next.js": "#000000",
  react: "#61dafb",
  vue: "#41b883",
  svelte: "#ff3e00",
  angular: "#dd0031",
  astro: "#ff5d01",
  express: "#259dff",
  nestjs: "#e0234e",
  django: "#092e20",
  fastapi: "#009688",
  laravel: "#ff2d20",
  spring: "#6db33f",
  flutter: "#02569b",
  "react native": "#61dafb",

  // ── Tecnologie / servizi ──
  supabase: "#3ecf8e",
  vercel: "#000000",
  render: "#5a4ee3",
  postgresql: "#336791",
  mysql: "#4479a1",
  mongodb: "#47a248",
  redis: "#dc382d",
  firebase: "#ffca28",
  aws: "#ff9900",
  cloudflare: "#f38020",
  stripe: "#635bff",
  "tailwind css": "#06b6d4",
  prisma: "#2d3748",

  // ── Strumenti ──
  github: "#181717",
  gitlab: "#fc6d26",
  docker: "#2496ed",
  "github actions": "#2088ff",
  vite: "#646cff",
  turbopack: "#ef4444",
  eslint: "#4b32c3",
  prettier: "#f7b93e",
  jest: "#c21325",
  playwright: "#2ead33",
  figma: "#f24e1e",
  postman: "#ff6c37",
};

/** Colore brand di una tecnologia, o null se non in palette. */
export function getTechColor(name: string | null | undefined): string | null {
  if (!name) return null;
  return TECH_COLORS[name.trim().toLowerCase()] ?? null;
}

/**
 * Colore identificativo del progetto in base allo stack (stile GitHub):
 * linguaggio principale → framework → colore scelto a mano (fallback).
 */
export function resolveProjectColor(opts: {
  language?: string | null;
  framework?: string | null;
  fallback: string;
}): string {
  return (
    getTechColor(opts.language) ?? getTechColor(opts.framework) ?? opts.fallback
  );
}
