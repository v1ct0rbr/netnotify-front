import api from '@/config/axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/AuthService';
import { toast } from 'sonner';

/**
 * Roles específicas da aplicação (enum do backend)
 * Deve corresponder ao enum ApplicationRole do backend
 */
export type ApplicationRole = 
  | 'SERVER_MANAGER'      // Pode gerenciar servidores
  | 'ALERT_MANAGER'       // Pode gerenciar alertas
  | 'REPORT_VIEWER'       // Pode visualizar relatórios
  | 'SYSTEM_ADMIN'        // Administração completa do sistema
  | 'MONITORING_VIEWER'   // Apenas visualização de monitoramento
  | 'ROLE_USER';

export interface UserInfo {
  fullName: string;
  username: string;
  email: string;
  roles: ApplicationRole[];
}

export interface KeycloakTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserInfo;
}

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  refreshToken: string | null;
  isChecking: boolean;
  isAuthenticated: boolean;
  setUser: (user: UserInfo | null) => void;
  setToken: (token: string | null) => void;
  setTokens: (response: KeycloakTokenResponse) => void;  
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  getAuthInfo: () => Promise<{ user: UserInfo | null; isAuthenticated: boolean }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isChecking: false,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),

  // Método para armazenar tokens e usuário recebidos do OAuth2 Keycloak
  setTokens: (response: KeycloakTokenResponse) => {
    console.log('💾 [auth] Armazenando tokens e dados do usuário:', response.user);
    console.log('💾 [auth] Access Token (primeiros 50 chars):', response.accessToken.substring(0, 50) + '...');
    
    // IMPORTANTE: localStorage com nomes EXATOS que o interceptador procura
    localStorage.setItem('access_token', response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken);
    }
    
    // ✅ CRÍTICO: Salvar os dados do usuário também!
    // Isso é essencial para restaurar o usuário ao recarregar a página
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
      console.log('💾 [auth] User salvo em localStorage:', response.user.username);
    }
    
    // ✅ NÃO adicionar header aqui - o interceptador faz isso automaticamente!
    // Apenas atualizar o estado
    set({
      token: response.accessToken,
      refreshToken: response.refreshToken || null,
      user: response.user,
      isAuthenticated: true,
    });
    
    console.log('✅ [auth] setTokens concluído - interceptador vai adicionar header');
  },


  logout: async () => {
    console.log('🚪 [auth] Iniciando logout...');
    try {
      // Chamar o authService que faz logout local + Keycloak
      await authService.logout();
      
      // ✅ CRÍTICO: Limpar localStorage completamente!
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('expires_in');
      localStorage.removeItem('token_type');
      localStorage.removeItem('auth_attempted_codes'); // Limpar códigos tentados
      localStorage.removeItem('__pkce_code_verifier__'); // Limpar verifier PKCE
      console.log('💾 [auth] localStorage limpo completamente');
      
      // Limpar store
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      console.log('✅ [auth] Logout completo realizado');
      
      // ✅ Recarregar a página para resetar tudo e voltar ao fluxo de auth do Keycloak
      setTimeout(() => {
        console.log('🔄 [auth] Recarregando página...');
        window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('❌ [auth] Erro durante logout:', error);
      // Mesmo com erro, limpar estado local E localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('expires_in');
      localStorage.removeItem('token_type');
      localStorage.removeItem('auth_attempted_codes');
      localStorage.removeItem('__pkce_code_verifier__');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      
      // Mesmo com erro, recarregar para voltar ao fluxo de auth
      setTimeout(() => {
        console.log('🔄 [auth] Recarregando página após erro...');
        window.location.href = '/';
      }, 100);
    }
  },

  checkAuth: async () => {
    set({ isChecking: true });
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('❌ [auth] Sem access_token no localStorage');
        set({ isChecking: false });
        return false;
      }

      console.log('🔍 [auth] Verificando auth com token (primeiros 50 chars):', token.substring(0, 50) + '...');
      
      // ✅ NÃO adicionar header aqui - o interceptador faz isso automaticamente!
      const res = await api.get('/profile/me') as { data: { user: UserInfo } };
      
      if (res.data?.user) {
        console.log('✅ [auth] Usuário verificado:', res.data.user.username);
        set({ user: res.data.user, token, isAuthenticated: true, isChecking: false });
        return true;
      }

      console.log('❌ [auth] checkAuth - sem dados de usuário');
      set({ isChecking: false });
      return false;
    } catch (err) {
      console.error('[auth] checkAuth failed:', err);
      console.error('[auth] Error response:', (err as any)?.response?.status, (err as any)?.response?.data);
      localStorage.removeItem('access_token');
      set({ user: null, token: null, isAuthenticated: false, isChecking: false });
      return false;
    }
  },

  getAuthInfo: async () => {
    set({ isChecking: true });
    try {
      const res = await api.get('/profile/me') as { data: { user: UserInfo } };
      const token = localStorage.getItem('access_token');
      const isAuthenticated = !!(token && res.data?.user);
      
      // Atualizar o store com os dados do usuário
      if (res.data?.user) {
        set({ user: res.data.user, token, isAuthenticated, isChecking: false });
      }
      
      return { user: res.data?.user || null, isAuthenticated };
    } catch (error) {
      toast.error('Erro ao obter informações de autenticação.');
      console.error('[auth] getAuthInfo failed:', error);
      set({ isChecking: false, isAuthenticated: false });
      return { user: null, isAuthenticated: false };
    }
  }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);