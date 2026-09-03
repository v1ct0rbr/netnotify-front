/**
 * Armazenamento seguro de tokens — SOMENTE MEMÓRIA
 *
 * Tokens JWT (access_token e refresh_token) são dados sensíveis. Para máxima
 * segurança, eles NUNCA são persistidos em localStorage nem sessionStorage:
 *  - ficam apenas em variáveis de memória do módulo
 *  - são limpos da memória em qualquer logout
 *  - não sobrevivem a recarregamento/fechamento do navegador (re-login)
 *
 * Isso elimina qualquer superfície de roubo de tokens via storage
 * (ex.: XSS persistente, extensões do navegador, processos de terceiros).
 *
 * Apenas o perfil do usuário (nome, email, roles — dados NÃO sensíveis) pode
 * ser persistido em localStorage pelos módulos que o utilizam.
 */

// Fonte única e exclusiva: memória do módulo
let accessToken: string | null = null;
let refreshToken: string | null = null;
let expiresIn: number | null = null;
let tokenType: string | null = null;

/**
 * Sem persistência: NÃO há hidratação a partir de storage.
 * A sessão só existe enquanto os tokens estão na memória do processo atual.
 */
export function hydrateTokensFromSession(): void {
  // intencionalmente vazio — nada a restaurar
}

export function setTokens(token: string, refresh: string | null, exp?: number | null, type?: string | null): void {
  accessToken = token;
  refreshToken = refresh;
  expiresIn = exp ?? null;
  tokenType = type ?? null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function getExpiresIn(): number | null {
  return expiresIn;
}

export function getTokenType(): string | null {
  return tokenType;
}

export function hasTokens(): boolean {
  return !!accessToken;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  expiresIn = null;
  tokenType = null;
}
