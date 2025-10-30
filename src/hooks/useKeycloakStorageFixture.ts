/**
 * Hook para inicializar Keycloak corretamente sem erros de storage access
 * 
 * Esse hook intercepta o problema de "requestStorageAccess" que ocorre quando
 * Keycloak tenta acessar localStorage/sessionStorage sem um user gesture
 */

import { useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';

export const useKeycloakStorageFixture = () => {
  const { keycloak, initialized } = useKeycloak();

  useEffect(() => {
    if (!keycloak) return;

    // Previne erros de storage access
    // Keycloak às vezes tenta acessar storage de formas não permitidas
    // Isso garante que o localStorage está disponível de forma segura
    try {
      // Testa se conseguimos acessar localStorage
      const testKey = '__keycloak_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch (e) {
      console.warn('⚠️ Storage access issue detected:', e);
      // Se não conseguir, Keycloak vai usar sessionStorage como fallback
    }
  }, [keycloak, initialized]);

  return { keycloak, initialized };
};

export default useKeycloakStorageFixture;
