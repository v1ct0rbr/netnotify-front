/**
 * Serviço de autenticação com Keycloak
 * 
 * Responsável por:
 * 1. Receber o código de autorização do Keycloak
 * 2. Enviar para o backend trocar por token
 * 3. Armazenar o token no localStorage
 * 4. Fazer logout no backend (que revoga no Keycloak)
 */

import type { UserInfo } from '@/store/useAuthStore';
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
   * Faz logout completo via backend
   * 
   * O backend é responsável por:
   * 1. Validar o refresh token (usando Authorization header do interceptador Axios)
   * 2. Revogar o refresh token no Keycloak
   * 3. Limpar sessões
   * 
   * NOTA: O Authorization header é adicionado automaticamente pelo interceptador do Axios
   * que lê o access_token do localStorage
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const accessToken = localStorage.getItem('access_token');
      
      console.log('🚪 [auth] Iniciando logout...');
      console.log('📦 [DEBUG] localStorage state:');
      console.log('   - access_token:', accessToken ? `${accessToken.substring(0, 50)}...` : 'NÃO ENCONTRADO');
      console.log('   - refresh_token:', refreshToken ? `${refreshToken.substring(0, 50)}...` : 'NÃO ENCONTRADO');
      console.log('   - token:', localStorage.getItem('token') ? `${localStorage.getItem('token')!.substring(0, 50)}...` : 'NÃO ENCONTRADO');
      console.log('   - user:', localStorage.getItem('user'));

      // 1. Notificar backend para revogação e limpeza ANTES de limpar localmente
      // O interceptador do Axios adiciona o Authorization header automaticamente
      if (refreshToken) {
        try {
          console.log('📡 Chamando endpoint de logout no backend...');
          console.log('📡 Enviando refresh_token (primeiros 50 chars):', refreshToken.substring(0, 50) + '...');
          
          const response = await api.post('/auth/logout', {            
            refresh_token: refreshToken  // snake_case conforme @JsonProperty do backend
          });
          
          console.log('✅ Backend logout realizado - Status:', response.status);
          console.log('✅ Resposta do backend:', response.data);
        } catch (error: any) {
          console.warn('⚠️ Backend logout falhou:', error.message);
          console.warn('🔴 Status:', error.response?.status);
          console.warn('🔴 Dados:', error.response?.data);
          console.warn('🔴 Headers da requisição:', error.config?.headers);
          // Não impede logout local - vai ser feito mesmo assim
        }
      } else {
        console.warn('⚠️ Refresh token não disponível para logout no backend');
      }

      // 2. Remover dados locais
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('expires_in');
      localStorage.removeItem('token_type');
      localStorage.removeItem('auth-storage'); // Zustand store
      
      // ✅ NÃO adicionar/remover header manualmente - o interceptador cuida disso!
      // delete api.defaults.headers.common['Authorization'];

      console.log('✅ Logout local realizado');

      // 3. Marcar timestamp de logout para evitar reautenticação imediata
      sessionStorage.setItem('logout_timestamp', Date.now().toString());
      console.log('⏱️ Logout timestamp marcado');
      console.log('✅ [auth] Logout completo realizado');
    } catch (error) {
      console.error('❌ Erro durante logout:', error);
      // Mesmo com erro, limpar tudo localmente
      localStorage.clear();
      sessionStorage.removeItem('pkce_code_verifier');
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
