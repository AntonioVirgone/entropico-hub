/**
 * Client minimale per l'API GitHub usato lato server.
 * Il token è il provider_token OAuth dell'utente (scope `repo`), mai esposto
 * al browser.
 */

const GITHUB_API = "https://api.github.com";

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export interface CreatedRepo {
  html_url: string;
  full_name: string;
}

/**
 * Estrae "owner/repo" da un URL GitHub completo o da una stringa breve.
 * Accetta: https://github.com/owner/repo[.git][/] oppure owner/repo.
 * Ritorna null se il formato non è riconosciuto.
 */
export function parseGithubRepoInput(input: string): string | null {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+\/[^/#?]+)$/);
  if (urlMatch) return urlMatch[1];
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed;
  return null;
}

/** Recupera i metadati di un repository e verifica che sia accessibile col token. */
export async function getRepo(token: string, fullName: string): Promise<CreatedRepo> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) await failGithub(res);
  const data = (await res.json()) as { html_url: string; full_name: string };
  return { html_url: data.html_url, full_name: data.full_name };
}

export class GithubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GithubError";
    this.status = status;
  }
}

/** Legge il messaggio d'errore da una risposta GitHub e lancia un GithubError. */
async function failGithub(res: Response): Promise<never> {
  let detail = "";
  try {
    const body = (await res.json()) as { message?: string };
    detail = body.message ?? "";
  } catch {
    // corpo non JSON
  }
  if (res.status === 401) throw new GithubError("Token GitHub non valido o scaduto.", 401);
  if (res.status === 403)
    throw new GithubError(detail || "Permessi GitHub insufficienti.", 403);
  if (res.status === 404)
    throw new GithubError(detail || "Repository o riferimento non trovato.", 404);
  throw new GithubError(detail || `Errore GitHub (HTTP ${res.status}).`, res.status);
}

/** Branch di default del repository (es. "main"). */
export async function getRepoDefaultBranch(
  token: string,
  fullName: string
): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) await failGithub(res);
  const data = (await res.json()) as { default_branch?: string };
  return data.default_branch ?? "main";
}

/**
 * Crea un branch a partire da `fromBranch`. Idempotente: se il branch esiste
 * già, ritorna { created: false } senza errore.
 */
export async function createBranch(
  token: string,
  fullName: string,
  newBranch: string,
  fromBranch: string
): Promise<{ created: boolean }> {
  // SHA del branch base
  const refRes = await fetch(
    `${GITHUB_API}/repos/${fullName}/git/ref/heads/${encodeURIComponent(fromBranch)}`,
    { headers: githubHeaders(token), cache: "no-store" }
  );
  if (!refRes.ok) await failGithub(refRes);
  const refData = (await refRes.json()) as { object?: { sha?: string } };
  const sha = refData.object?.sha;
  if (!sha) throw new GithubError("Impossibile leggere lo SHA del branch base.", 500);

  const createRes = await fetch(`${GITHUB_API}/repos/${fullName}/git/refs`, {
    method: "POST",
    headers: githubHeaders(token),
    cache: "no-store",
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha }),
  });

  // 422 = il riferimento esiste già: trattalo come "non creato" (idempotente).
  if (createRes.status === 422) return { created: false };
  if (!createRes.ok) await failGithub(createRes);
  return { created: true };
}

/** Login GitHub dell'utente proprietario del token (per mostrare "connesso come …"). */
export async function getGithubLogin(token: string): Promise<string | null> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: githubHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { login?: string };
  return data.login ?? null;
}

/**
 * Crea un repository sull'account dell'utente proprietario del token.
 * `autoInit` aggiunge un README iniziale.
 */
export async function createUserRepo(
  token: string,
  params: {
    name: string;
    description?: string | null;
    isPrivate: boolean;
    autoInit: boolean;
  }
): Promise<CreatedRepo> {
  const res = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: githubHeaders(token),
    cache: "no-store",
    body: JSON.stringify({
      name: params.name,
      description: params.description ?? undefined,
      private: params.isPrivate,
      auto_init: params.autoInit,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as {
        message?: string;
        errors?: { message?: string }[];
      };
      detail =
        body.errors?.map((e) => e.message).filter(Boolean).join("; ") ||
        body.message ||
        "";
    } catch {
      // corpo non JSON: ignora, usa solo lo status
    }

    if (res.status === 401)
      throw new GithubError("Token GitHub non valido o scaduto.", 401);
    if (res.status === 403)
      throw new GithubError(
        detail || "Permessi GitHub insufficienti (scope 'repo' mancante?).",
        403
      );
    if (res.status === 422)
      throw new GithubError(
        detail || "Esiste già un repository con questo nome.",
        422
      );
    throw new GithubError(detail || `Errore GitHub (HTTP ${res.status}).`, res.status);
  }

  const data = (await res.json()) as CreatedRepo;
  return { html_url: data.html_url, full_name: data.full_name };
}
