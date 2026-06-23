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

export class GithubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GithubError";
    this.status = status;
  }
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
