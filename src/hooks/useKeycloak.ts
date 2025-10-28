// src/hooks/useKeycloak.ts
import { useKeycloak as useKeycloakBase } from '@react-keycloak/web';
import keycloak from '@/config/keycloak';

export const useKeycloak = () => {
  const { keycloak: kc, initialized } = useKeycloakBase();
  
  return {
    keycloak: kc || keycloak,
    initialized,
    isAuthenticated: kc?.authenticated || false,
    token: kc?.token,
    user: kc?.tokenParsed,
    login: () => kc?.login(),
    logout: () => kc?.logout(),
    refresh: () => kc?.updateToken(60),
  };
};