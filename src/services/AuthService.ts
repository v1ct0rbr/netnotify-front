/**
 * Serviço de autenticação com Keycloak
 * 
 * Responsável por:
 * 1. Receber o código de autorização do Keycloak
 * 2. Enviar para o backend trocar por token
 * 3. Armazenar o token no localStorage
 */

import type { User } from '@/store/useAuthStore';
import api from '../config/axios';

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
    user: User;
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
      
      // Armazena tokens (axios interceptor procura por 'token')
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);

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
   * Faz logout
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');

    console.log('✅ Logout realizado');
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
