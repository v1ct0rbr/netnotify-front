import api from '@/config/axios';
import { create } from 'zustand';
import { authService } from '@/services/AuthService';

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
}

export const useAuthStore = create<AuthState>((set) => ({
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
    
    localStorage.setItem('access_token', response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken);
    }
    
    api.defaults.headers.common['Authorization'] = `Bearer ${response.accessToken}`;
    
    set({
      token: response.accessToken,
      refreshToken: response.refreshToken || null,
      user: response.user,
      isAuthenticated: true,
    });
  },


  logout: async () => {
    console.log('🚪 [auth] Iniciando logout...');
    try {
      // Chamar o authService que faz logout local + Keycloak
      await authService.logout();
      
      // Limpar store
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      console.log('✅ [auth] Logout completo realizado');
    } catch (error) {
      console.error('❌ [auth] Erro durante logout:', error);
      // Mesmo com erro, limpar estado local
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    set({ isChecking: true });
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        set({ isChecking: false });
        return false;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const res = await api.get('/profile/me') as { data: { user: UserInfo } };
      if (res.data?.user) {
        set({ user: res.data.user, token, isAuthenticated: true, isChecking: false });
        return true;
      }

      set({ isChecking: false });
      return false;
    } catch (err) {
      console.error('[auth] checkAuth failed:', err);
      localStorage.removeItem('access_token');
      set({ user: null, token: null, isAuthenticated: false, isChecking: false });
      return false;
    }
  },
}));