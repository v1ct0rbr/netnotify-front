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
  | 'SERVER_MANAGER'
  | 'ALERT_MANAGER'
  | 'REPORT_VIEWER'
  | 'SYSTEM_ADMIN'
  | 'MONITORING_VIEWER'
  | 'ROLE_USER';

function mapToApplicationRole(role: string): ApplicationRole | null {
  const r = role.toUpperCase();
  if (r === 'SERVER_MANAGER' || r.includes('SERVER_MANAGER')) return 'SERVER_MANAGER';
  if (r === 'ALERT_MANAGER' || r.includes('ALERT_MANAGER')) return 'ALERT_MANAGER';
  if (r === 'REPORT_VIEWER' || r.includes('REPORT_VIEWER')) return 'REPORT_VIEWER';
  if (r === 'SYSTEM_ADMIN' || r.includes('SYSTEM_ADMIN') || r.includes('ADMIN')) return 'SYSTEM_ADMIN';
  if (r === 'MONITORING_VIEWER' || r.includes('MONITORING_VIEWER')) return 'MONITORING_VIEWER';
  if (r === 'ROLE_USER' || r.includes('USER')) return 'ROLE_USER';
  return null;
}

function extractApplicationRolesFromToken(
  token: string | null | undefined,
  knownRoles?: string[] | null,
): ApplicationRole[] {
  const set = new Set<ApplicationRole>();

  if (Array.isArray(knownRoles)) {
    knownRoles.forEach((r) => {
      const mapped = mapToApplicationRole(r);
      if (mapped) set.add(mapped);
    });
  }

  if (!token) return Array.from(set);

  try {
    const parts = token.split('.');
    if (parts.length < 2) return Array.from(set);
    const payload = JSON.parse(decodeURIComponent(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    ));

    if (payload?.realm_access?.roles && Array.isArray(payload.realm_access.roles)) {
      payload.realm_access.roles.forEach((r: string) => {
        const mapped = mapToApplicationRole(r);
        if (mapped) set.add(mapped);
      });
    }

    if (payload?.resource_access && typeof payload.resource_access === 'object') {
      Object.values(payload.resource_access).forEach((res: any) => {
        if (res?.roles && Array.isArray(res.roles)) {
          res.roles.forEach((r: string) => {
            const mapped = mapToApplicationRole(r);
            if (mapped) set.add(mapped);
          });
        }
      });
    }
  } catch (e) {
    console.warn('[auth] erro ao decodificar token para extrair roles', e);
  }

  return Array.from(set);
}

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

  setTokens: (response: KeycloakTokenResponse) => {
    localStorage.setItem('access_token', response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken);
    }
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    const normalizedRoles = extractApplicationRolesFromToken(
      response.accessToken,
      response.user?.roles as unknown as string[] | undefined,
    );
    const userWithRoles: UserInfo = {
      ...response.user,
      roles: normalizedRoles,
    };

    set({
      token: response.accessToken,
      refreshToken: response.refreshToken || null,
      user: userWithRoles,
      isAuthenticated: true,
    });
  },


  logout: async () => {
    console.log('🚪 [auth] Iniciando logout...');
    const _doKeycloakRedirect = () => {
      const keycloakUrl =
        import.meta.env.VITE_KEYCLOAK_AUTH_SERVER_URL ||
        import.meta.env.VITE_KEYCLOAK_URL ||
        '';
      const realm = import.meta.env.VITE_KEYCLOAK_REALM || '';
      const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || '';
      const postLogoutRedirectUri = window.location.origin + '/';
      if (keycloakUrl && realm && clientId) {
        window.location.href = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout?client_id=${clientId}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
      } else {
        window.location.href = '/';
      }
    };

    try {
      await authService.logout();

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('expires_in');
      localStorage.removeItem('token_type');
      localStorage.removeItem('auth_attempted_codes');
      localStorage.removeItem('__pkce_code_verifier__');

      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });

      _doKeycloakRedirect();
    } catch (error) {
      console.error('❌ [auth] Erro durante logout:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('expires_in');
      localStorage.removeItem('token_type');
      localStorage.removeItem('auth_attempted_codes');
      localStorage.removeItem('__pkce_code_verifier__');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });

      _doKeycloakRedirect();
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

      const res = await api.get('/profile/me');
      const currentToken = localStorage.getItem('access_token') || token;
      const candidate = (res as any)?.data?.user ?? (res as any)?.data;
      const hasUsername = candidate && typeof candidate === 'object' && typeof candidate.username === 'string';

      if (hasUsername) {
        const normalizedRoles = extractApplicationRolesFromToken(currentToken, candidate.roles as unknown as string[] | undefined);
        const userWithRoles: UserInfo = { ...candidate, roles: normalizedRoles };
        set({ user: userWithRoles, token: currentToken, isAuthenticated: true, isChecking: false });
        return true;
      }

      set({ isChecking: false });
      return false;
    } catch (err) {
      console.error('[auth] checkAuth failed:', err);
      const status = (err as any)?.response?.status;

      if (status === 403) {
        const storedUser = localStorage.getItem('user');
        const fallbackUser = storedUser ? (JSON.parse(storedUser) as UserInfo) : null;
        const currentToken = localStorage.getItem('access_token');
        set({ user: fallbackUser, token: currentToken || null, isAuthenticated: true, isChecking: false });
        return true;
      }

      localStorage.removeItem('access_token');
      set({ user: null, token: null, isAuthenticated: false, isChecking: false });
      return false;
    }
  },

  getAuthInfo: async () => {
    set({ isChecking: true });
    try {
      const res = await api.get('/profile/me');
      const token = localStorage.getItem('access_token');
      const candidate = (res as any)?.data?.user ?? (res as any)?.data;
      const hasUsername = candidate && typeof candidate === 'object' && typeof candidate.username === 'string';
      const isAuthenticated = !!(token && hasUsername);

      if (hasUsername) {
        const normalizedRoles = extractApplicationRolesFromToken(token, candidate.roles as unknown as string[] | undefined);
        const userWithRoles: UserInfo = { ...candidate, roles: normalizedRoles };
        set({ user: userWithRoles, token, isAuthenticated, isChecking: false });
      }

      return { user: hasUsername ? (candidate as UserInfo) : null, isAuthenticated };
    } catch (error) {
      const status = (error as any)?.response?.status;
      console.error('[auth] getAuthInfo failed:', error);

      if (status === 403) {
        set({ isChecking: false });
        const storedUser = localStorage.getItem('user');
        const fallbackUser = storedUser ? (JSON.parse(storedUser) as UserInfo) : null;
        return { user: fallbackUser, isAuthenticated: true };
      }

      toast.error('Erro ao obter informações de autenticação.');
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