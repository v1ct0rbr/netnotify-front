import { create } from 'zustand';
import api from '@/config/axios';
import keycloak from '@/config/keycloak';

export type RoleName = 'ROLE_SUPER' | 'ROLE_USER' | 'ROLE_GUEST';

interface LoginResponse {
  token: string;
  user: User;
}

interface Role {  
  name: RoleName;
}

export interface User {
  fullName?: string;
  username: string;
  email?: string;
  roles: Role[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isChecking: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (username: string, password: string, typeLogin: 'password' | 'ldap') => Promise<void>;
  loginKeycloak: () => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isChecking: false,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),

  login: async (username, password, typeLogin) => {
    console.log('[auth] login called with', { username, typeLogin });

    const url = typeLogin === 'ldap' ? '/auth/ldap-login' : '/auth/login';

    const res = await api.post(url, { username, password }, {
      headers: { 'Content-Type': 'application/json' },
    }) as { data: LoginResponse };

    const token = res.data.token;
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    set({ token, user: res.data.user, isAuthenticated: true });
  },

  loginKeycloak: () => {
    keycloak.login();
  },

  logout: () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null, isAuthenticated: false });
    keycloak.logout();
  },

  checkAuth: async () => {
    set({ isChecking: true });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isChecking: false });
        return false;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const res = await api.get('/profile/me') as { data: { user: User } };
      if (res.data?.user) {
        set({ user: res.data.user, token, isAuthenticated: true, isChecking: false });
        return true;
      }

      set({ isChecking: false });
      return false;
    } catch (err) {
      console.error('[auth] checkAuth failed:', err);
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isChecking: false });
      return false;
    }
  },
}));