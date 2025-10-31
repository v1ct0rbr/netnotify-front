// src/config/keycloak.ts
import Keycloak from 'keycloak-js';

/**
 * Configuração do Keycloak para o fluxo OAuth2 Authorization Code
 * 
 * Variáveis de ambiente esperadas:
 * - VITE_KEYCLOAK_URL: URL base do servidor Keycloak (ex: https://keycloak.derpb.com.br)
 * - VITE_KEYCLOAK_REALM: Nome do realm (ex: testes)
 * - VITE_KEYCLOAK_CLIENT_ID: Client ID configurado no Keycloak (ex: netnotify-frontend)
 */
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.derpb.com.br',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'testes',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'teste-cli',  
});


export default keycloak;