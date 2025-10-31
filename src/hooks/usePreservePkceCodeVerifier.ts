/**
 * Hook para capturar e preservar o PKCE code_verifier
 * 
 * O Keycloak JS gera e guarda o code_verifier, mas o limpa após redirecionar
 * Este hook preserva antes que seja limpo
 */

import { useEffect } from 'react';

const PKCE_STORAGE_KEY = '__pkce_code_verifier__';

/**
 * Hook que preserva o code_verifier em sessionStorage
 * Deve ser executado logo no início da aplicação, ANTES do Keycloak fazer redirect
 */
export const usePreservePkceCodeVerifier = () => {
  useEffect(() => {
    console.log('🔍 [PKCE Preservation] Preservando code_verifier...');

    // Procura o code_verifier no localStorage (onde o Keycloak JS guarda)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      const v = localStorage.getItem(k) || '';

      try {
        const parsed = JSON.parse(v);
        if (parsed.pkceCodeVerifier) {
          // Encontrou! Guarda em sessionStorage com chave conhecida
          sessionStorage.setItem(PKCE_STORAGE_KEY, parsed.pkceCodeVerifier);
          console.log('✅ [PKCE Preservation] code_verifier preservado!');
          console.log('    Valor:', parsed.pkceCodeVerifier.substring(0, 50) + '...');
          return;
        }
      } catch (e) {
        // Não é JSON, continua
      }
    }

    console.log('ℹ️ [PKCE Preservation] Nenhum code_verifier encontrado para preservar');
  }, []);
};

/**
 * Recupera o code_verifier preservado
 * @returns code_verifier ou undefined
 */
export function getPreservedPkceCodeVerifier(): string | undefined {
  const v = sessionStorage.getItem(PKCE_STORAGE_KEY);
  if (v) {
    console.log('✅ [PKCE] code_verifier recuperado de preservação!');
    return v;
  }
  return undefined;
}

/**
 * Limpa o code_verifier preservado (após uso)
 */
export function clearPreservedPkceCodeVerifier(): void {
  sessionStorage.removeItem(PKCE_STORAGE_KEY);
  console.log('🧹 [PKCE] code_verifier preservado foi limpo');
}
