/**
 * Serviço de autenticação com Keycloak
 * 
 * Responsável por:
 * 1. Receber o código de autorização do Keycloak
 * 2. Enviar para o backend trocar por token
 * 3. Armazenar o token no localStorage
 * 4. Fazer logout no Keycloak
 */

import type { UserInfo } from '@/store/useAuthStore';
import api from '../config/axios';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_AUTH_SERVER_URL || 'https://keycloak.derpb.com.br';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'testes';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'netnotify-front';

class AuthService {

  /**
   * Troca código de autorização por token
   * 
   * Chamado após usuário fazer login no Keycloak
   * @param code - Código de autorização retornado por Keycloak
   * @param redirectUri - URI de redirecionamento (deve ser o mesmo usado no login)
   * @param codeVerifier - Code verifier PKCE (opcional)
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: UserInfo;
  }> {
    try {
      console.log('🔄 Trocando código por token...');
      console.log('📝 Código:', code.substring(0, 50) + '...');
      console.log('🌐 URL do Backend:', api.defaults.baseURL);
      console.log('📍 Redirect URI:', redirectUri);
      console.log('🔐 Code Verifier:', codeVerifier ? 'presente (' + codeVerifier.substring(0, 30) + '...)' : 'ausente ❌');

      const payload = {
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      };

      console.log('📤 Payload enviado:', JSON.stringify(payload, null, 2));

      const response = await api.post('/auth/callback', payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Redirect-Uri': redirectUri,
        }
      });

      console.log('✅ Token recebido com sucesso');
      console.log('📦 Resposta:', {
        access_token: response.data.access_token?.substring(0, 50) + '...',
        refresh_token: response.data.refresh_token?.substring(0, 50) + '...',
        expires_in: response.data.expires_in,
        user: response.data.user
      });
      
      // Armazena tokens e dados do usuário no localStorage
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('access_token', response.data.access_token); // Compatibilidade
      localStorage.setItem('refresh_token', response.data.refresh_token);
      localStorage.setItem('expires_in', response.data.expires_in?.toString() || '3600');
      localStorage.setItem('token_type', response.data.token_type || 'Bearer');
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao trocar código por token:', error);
      console.error('🔴 Status:', error.response?.status);
      console.error('🔴 Dados:', error.response?.data);
      console.error('🔴 Headers:', error.config?.headers);
      throw error;
    }
  }

  /**
   * Renova o token usando refresh token
   * (Currently unused - can be called when token expires)
   */
  // private async refreshToken(refreshToken: string): Promise<{
  //   access_token: string;
  //   refresh_token: string;
  //   expires_in: number;
  // }> {
  //   console.log('🔄 Renovando token...');
  //   const response = await api.post('/auth/refresh', {
  //     refresh_token: refreshToken,
  //   });
  //   console.log('✅ Token renovado');
  //   localStorage.setItem('token', response.data.access_token);
  //   localStorage.setItem('refresh_token', response.data.refresh_token);
  //   return response.data;
  // }

  /**
   * Faz logout no Keycloak revogando o refresh token
   */
  private async revokeTokenInKeycloak(refreshToken: string): Promise<void> {
    try {
      console.log('🔐 Revogando token no Keycloak...');

      const formData = new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      });

      const response = await fetch(
        `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/revoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        }
      );

      if (response.ok) {
        console.log('✅ Token revogado com sucesso no Keycloak');
      } else {
        console.warn('⚠️ Erro ao revogar token no Keycloak:', response.status);
      }
    } catch (error) {
      console.error('❌ Erro ao revogar token no Keycloak:', error);
      // Não lançar erro - logout local já foi feito
    }
  }

  /**
   * Faz logout completo (local + Keycloak)
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];

      console.log('✅ Logout local realizado');

      // Se temos refresh token, revogar no Keycloak também
      if (refreshToken) {
        await this.revokeTokenInKeycloak(refreshToken);
      }

      // Marcar timestamp de logout para evitar reautenticação imediata
      sessionStorage.setItem('logout_timestamp', Date.now().toString());
      console.log('⏱️ Logout timestamp marcado');
    } catch (error) {
      console.error('❌ Erro durante logout:', error);
      throw error;
    }
  }

  /**
   * Retorna token atual
   */
  getAccessToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Verifica se está autenticado
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}

// Instância única do serviço
export const authService = new AuthService();

export default AuthService;
