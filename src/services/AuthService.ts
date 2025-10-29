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
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: User;
  }> {
    try {
      console.log('🔄 Trocando código por token...');
      
      const response = await api.post('/auth/callback', {
        code: code,
      });

      console.log('✅ Token recebido com sucesso');
      
      // Armazena tokens (axios interceptor procura por 'token')
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);

      return response.data;
    } catch (error) {
      console.error('❌ Erro ao trocar código por token:', error);
      throw error;
    }
  }

  /**
   * Renova o token usando refresh token
   */
  private async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    console.log('🔄 Renovando token...');
    
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

    console.log('✅ Token renovado');
    
    // Atualiza tokens
    localStorage.setItem('token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    
    return response.data;
  }

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
