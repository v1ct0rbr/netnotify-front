/**
 * Utilitários para PKCE (Proof Key for Code Exchange)
 * 
 * Extrai o code_verifier do storage do Keycloak JS
 */

/**
 * Procura o code_verifier no sessionStorage e localStorage
 * Primeiro tenta a versão preservada, depois procura normalmente
 * 
 * @returns code_verifier ou undefined
 */
export function getPkceCodeVerifierFromStorage(): string | undefined {
  // console.log('🔍 [PKCE] Procurando code_verifier no storage...');
  
  // Tenta a versão preservada primeiro (importa dinamicamente para evitar circular dependency)
  try {
    const { getPreservedPkceCodeVerifier } = require('../hooks/usePreservePkceCodeVerifier');
    const preserved = getPreservedPkceCodeVerifier();
    if (preserved) {
      // console.log('✅ [PKCE] Usando code_verifier preservado!');
      return preserved;
    }
  } catch {
    // console.log('ℹ️ [PKCE] Versão preservada não disponível');
  }

  // Procura em localStorage por um objeto JSON que contém `pkceCodeVerifier`
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || '';
    const v = localStorage.getItem(k) || '';
    
    try {
      // Tenta parsear como JSON
      const parsed = JSON.parse(v);
      
      // Se tem pkceCodeVerifier dentro, usa esse
      if (parsed.pkceCodeVerifier) {
        // console.log('✅ [PKCE] code_verifier encontrado em localStorage:', k);
        // console.log('    Valor:', parsed.pkceCodeVerifier.substring(0, 50) + '...');
        return parsed.pkceCodeVerifier;
      }
    } catch {
      // Não é JSON, passa para próximo
    }
  }

  // Tente sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i) || '';
    const v = sessionStorage.getItem(k) || '';
    
    try {
      const parsed = JSON.parse(v);
      if (parsed.pkceCodeVerifier) {
        // console.log('✅ [PKCE] code_verifier encontrado em sessionStorage:', k);
        // console.log('    Valor:', parsed.pkceCodeVerifier.substring(0, 50) + '...');
        return parsed.pkceCodeVerifier;
      }
    } catch {
      // Não é JSON, passa para próximo
    }
  }

  // Fallback: procura por chaves diretas (versões antigas)
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i) || '';
    if (k.endsWith('kc-cv') || k.toLowerCase().includes('codeverifier')) {
      const v = sessionStorage.getItem(k) || undefined;
      if (v) {
        // console.log('✅ [PKCE] code_verifier encontrado em sessionStorage (chave direta):', k);
        return v;
      }
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || '';
    if (k.endsWith('kc-cv') || k.toLowerCase().includes('codeverifier')) {
      const v = localStorage.getItem(k) || undefined;
      if (v) {
        // console.log('✅ [PKCE] code_verifier encontrado em localStorage (chave direta):', k);
        return v;
      }
    }
  }

  console.warn('⚠️ [PKCE] code_verifier não encontrado no storage');
  debugStorageKeys();
  return undefined;
}

/**
 * Debug: lista todas as chaves de storage para debugging
 */
export function debugStorageKeys(): void {
  // const sessionKeys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i));
  // const localKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
  // console.log('📦 [Storage Debug]');
  // console.log('  sessionStorage keys:', sessionKeys);
  // console.log('  localStorage keys:', localKeys);
}
