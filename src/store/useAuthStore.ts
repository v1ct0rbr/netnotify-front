import api from '@/config/axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/services/AuthService';
import { toast } from 'sonner';
import {
  getAccessToken,
  getRefreshToken,
  setTokens as persistTokens,
  clearTokens,
  hasTokens,
  hydrateTokensFromSession,
} from '@/lib/tokenStorage';

hydrateTokensFromSession();

/**
 * Roles específicas da aplicação (enum do backend)
 * Deve corresponder aos nomes de roles entregues pelo backend/Keycloak.
 */
export type ApplicationRole = 
  | 'SERVER_MANAGER'
  | 'ALERT_MANAGER'
  | 'REPORT_VIEWER'
  | 'MONITORING_VIEWER'
  | 'NETNOTIFY_ADMIN'
  | 'NETNOTIFY_USER';

function mapToApplicationRole(role: string): ApplicationRole | null {
  const r = role.toUpperCase();
  if (r === 'SERVER_MANAGER' || r.includes('SERVER_MANAGER')) return 'SERVER_MANAGER';
  if (r === 'ALERT_MANAGER' || r.includes('ALERT_MANAGER')) return 'ALERT_MANAGER';
  if (r === 'REPORT_VIEWER' || r.includes('REPORT_VIEWER')) return 'REPORT_VIEWER';
  if (r === 'NETNOTIFY_ADMIN' || r === 'SYSTEM_ADMIN' || r === 'ROLE_ADMIN' || r.includes('SYSTEM_ADMIN') || r.includes('NETNOTIFY_ADMIN')) return 'NETNOTIFY_ADMIN';
  if (r === 'MONITORING_VIEWER' || r.includes('MONITORING_VIEWER')) return 'MONITORING_VIEWER';
  if (r === 'NETNOTIFY_USER' || r === 'ROLE_USER' || r.includes('NETNOTIFY_USER')) return 'NETNOTIFY_USER';
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

type UserInfoLike = Omit<UserInfo, 'roles'> & {
  roles?: string[] | ApplicationRole[] | null;
};

function normalizeUserInfo(user: UserInfoLike | null | undefined, token?: string | null): UserInfo | null {
  if (!user || typeof user !== 'object') return null;

  const { fullName, username, email } = user;
  if (typeof fullName !== 'string' || typeof username !== 'string' || typeof email !== 'string') {
    return null;
  }

  return {
    fullName,
    username,
    email,
    roles: extractApplicationRolesFromToken(token, user.roles as string[] | undefined),
  };
}

function readNormalizedStoredUser(token?: string | null): UserInfo | null {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;

  try {
    return normalizeUserInfo(JSON.parse(storedUser) as UserInfoLike, token);
  } catch (error) {
    console.warn('[auth] erro ao normalizar usuário salvo no localStorage', error);
    localStorage.removeItem('user');
    return null;
  }
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

  setUser: (user) => {
    const token = getAccessToken();
    const normalizedUser = normalizeUserInfo(user, token);

    if (normalizedUser) {
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    } else {
      localStorage.removeItem('user');
    }

    set({ user: normalizedUser, isAuthenticated: !!normalizedUser });
  },
  setToken: (token) => set({ token }),

  setTokens: (response: KeycloakTokenResponse) => {
    persistTokens(
      response.accessToken,
      response.refreshToken || null,
      response.expiresIn,
      response.tokenType,
    );
    const userWithRoles = normalizeUserInfo(
      response.user as UserInfoLike,
      response.accessToken,
    );

    if (userWithRoles) {
      localStorage.setItem('user', JSON.stringify(userWithRoles));
    } else {
      localStorage.removeItem('user');
    }

    set({
      token: response.accessToken,
      refreshToken: response.refreshToken || null,
      user: userWithRoles,
      isAuthenticated: !!userWithRoles && hasTokens(),
    });
  },


  logout: async () => {
   // console.log('🚪 [auth] Iniciando logout...');
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

      clearTokens();
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('auth_attempted_codes');
      localStorage.removeItem('__pkce_code_verifier__');

      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });

      _doKeycloakRedirect();
    } catch (error) {
      console.error('❌ [auth] Erro durante logout:', error);
      clearTokens();
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('auth_attempted_codes');
      localStorage.removeItem('__pkce_code_verifier__');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });

      _doKeycloakRedirect();
    }
  },

  checkAuth: async () => {
    set({ isChecking: true });
    try {
      const token = getAccessToken();
      if (!token) {
        set({ isChecking: false });
        return false;
      }

      const res = await api.get('/profile/me');
      const currentToken = getAccessToken() || token;
      const candidate = (res as any)?.data?.user ?? (res as any)?.data;
      const hasUsername = candidate && typeof candidate === 'object' && typeof candidate.username === 'string';

      if (hasUsername) {
        const userWithRoles = normalizeUserInfo(candidate as UserInfoLike, currentToken);
        if (userWithRoles) {
          localStorage.setItem('user', JSON.stringify(userWithRoles));
        }
        set({ user: userWithRoles, token: currentToken, isAuthenticated: !!userWithRoles, isChecking: false });
        return true;
      }

      set({ isChecking: false });
      return false;
    } catch (err) {
      console.error('[auth] checkAuth failed:', err);
      const status = (err as any)?.response?.status;

      if (status === 403) {
        const fallbackUser = readNormalizedStoredUser(getAccessToken());
        const currentToken = getAccessToken();
        set({ user: fallbackUser, token: currentToken || null, isAuthenticated: !!fallbackUser, isChecking: false });
        return !!fallbackUser;
      }

      clearTokens();
      set({ user: null, token: null, isAuthenticated: false, isChecking: false });
      return false;
    }
  },

  getAuthInfo: async () => {
    set({ isChecking: true });
    try {
      const res = await api.get('/profile/me');
      const token = getAccessToken();
      const candidate = (res as any)?.data?.user ?? (res as any)?.data;
      const hasUsername = candidate && typeof candidate === 'object' && typeof candidate.username === 'string';
      const isAuthenticated = !!(token && hasUsername);

      if (hasUsername) {
        const userWithRoles = normalizeUserInfo(candidate as UserInfoLike, token);
        if (userWithRoles) {
          localStorage.setItem('user', JSON.stringify(userWithRoles));
        }
        set({ user: userWithRoles, token, isAuthenticated: !!userWithRoles && isAuthenticated, isChecking: false });
        return { user: userWithRoles, isAuthenticated: !!userWithRoles && isAuthenticated };
      }

      return { user: null, isAuthenticated };
    } catch (error) {
      const status = (error as any)?.response?.status;
      console.error('[auth] getAuthInfo failed:', error);

      if (status === 403) {
        set({ isChecking: false });
        const fallbackUser = readNormalizedStoredUser(getAccessToken());
        return { user: fallbackUser, isAuthenticated: !!fallbackUser };
      }

      toast.error('Erro ao obter informações de autenticação.');
      set({ isChecking: false, isAuthenticated: false });
      return { user: null, isAuthenticated: false };
    }
  }
    }),
    {
      name: 'auth-storage',
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<AuthState> | undefined;
        const persistedToken = typedState?.token ?? currentState.token ?? getAccessToken();
        const normalizedUser = normalizeUserInfo(typedState?.user as UserInfoLike | null | undefined, persistedToken)
          ?? currentState.user;

        if (normalizedUser) {
          localStorage.setItem('user', JSON.stringify(normalizedUser));
        }

        return {
          ...currentState,
          ...typedState,
          user: normalizedUser,
          token: getAccessToken(),
          refreshToken: getRefreshToken(),
          isAuthenticated: hasTokens() && (typedState?.isAuthenticated ?? currentState.isAuthenticated),
        };
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);