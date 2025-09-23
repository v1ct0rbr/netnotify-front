import { create } from 'zustand';
import api from '@/config/axios';
import camelcaseKeys from 'camelcase-keys';

// enum de rolename 
export type RoleName = 'ROLE_SUPER' | 'ROLE_USER' | 'ROLE_GUEST';


interface LoginResponse {
  token: string;
  user: User;
}

interface Role {
  id: number;
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
  login: (username: string, password: string, typeLogin: 'password' | 'ldap') => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  // internal lock (not exposed)
  _checkLock?: boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isChecking: false,
  isAuthenticated: false,
  _checkLock: false,

  login: async (username, password, typeLogin) => {

    const url = typeLogin === 'ldap' ? '/auth/ldap-login' : '/auth/login';

    const res = await api.post(url, { username, password },
    {
      headers: {
        'Content-Type': 'application/json',
        },
      }
    ) as { data: LoginResponse };   
   

   
    const token = res.data.token;
    console.debug('[auth] login response:', res.data);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // persist token and state
    localStorage.setItem('token', token);
    set({ token });

    // Atualiza o estado do usuário imediatamente após login
    const ok = await get().checkAuth();
    if (!ok) {
      throw new Error('Authentication failed after login');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return false;
    }

    // prevent concurrent checks
    if (get()._checkLock) return !!get().user;
    (get() as any)._checkLock = true;
    set({ isChecking: true });

    try {
      console.debug('[auth] checkAuth token from storage:', token);
      const res = await api.get('/profile/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.debug('[auth] /profile/me response:', res.data);
      const camelUser = res.data ? (camelcaseKeys(res.data as unknown as Record<string, unknown>, { deep: true }) as unknown as User) : null;
      set({
        user: camelUser,
        token,
        isAuthenticated: !!camelUser,
      });
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return !!camelUser;
    } catch (err) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
      return false;
    } finally {
      set({ isChecking: false });
      (get() as any)._checkLock = false;
    }
  },
}));