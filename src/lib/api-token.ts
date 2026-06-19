import { createHash, randomBytes } from "node:crypto";

/**
 * Utility per i token API personali.
 *
 * Il token in chiaro è mostrato all'utente UNA SOLA VOLTA alla creazione.
 * In database salviamo solo l'hash SHA-256 (per la verifica) e un prefisso
 * non sensibile (per riconoscere il token nell'elenco). Essendo il token
 * casuale a 256 bit, un hash veloce è adeguato: non serve un KDF lento.
 */

/** Prefisso riconoscibile dei token emessi da Entropico Hub. */
export const API_TOKEN_PREFIX = "eh_";

/** Numero di caratteri iniziali mostrati come anteprima (prefisso + parte random). */
const PREVIEW_LENGTH = 12;

export interface GeneratedApiToken {
  /** Token completo in chiaro — da mostrare una sola volta. */
  token: string;
  /** Anteprima non sensibile salvata in chiaro (es. "eh_a1b2c3d4"). */
  prefix: string;
  /** Hash SHA-256 (hex) del token completo, salvato in DB. */
  hash: string;
}

/** Calcola l'hash SHA-256 (hex) di un token completo. */
export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Genera un nuovo token casuale con relativi prefisso e hash. */
export function generateApiToken(): GeneratedApiToken {
  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    token,
    prefix: token.slice(0, PREVIEW_LENGTH),
    hash: hashApiToken(token),
  };
}

/** Estrae il Bearer token dall'header Authorization (stringa vuota se assente). */
export function extractBearerToken(authorization: string | null): string {
  if (!authorization) return "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}
