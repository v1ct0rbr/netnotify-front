// src/providers/KeycloakProvider.tsx
import React from 'react';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import keycloak from '@/config/keycloak';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/config/axios';
import { toast } from 'sonner';

type Props = {
  children: React.ReactNode;
};

export const KeycloakProvider: React.FC<Props> = ({ children }) => {
  const { setUser, setToken } = useAuthStore();

  const handleKeycloakTokens = async (tokens: any) => {
    if (!tokens?.token) return;

    try {
      // set token no header
      api.defaults.headers.common['Authorization'] = `Bearer ${tokens.token}`;
      localStorage.setItem('token', tokens.token);

      // valida token no backend e fetch user profile
      const res = await api.get('/profile/me');
      if (res.data?.user) {
        setUser(res.data.user);
        setToken(tokens.token);
      }
    } catch (err) {
      console.error('Falha ao sincronizar com backend:', err);
      toast.error('Erro ao autenticar com o servidor.');
      keycloak.logout();
    }
  };

  const onTokens = (tokens: any) => {
    handleKeycloakTokens(tokens);
  };

  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        checkLoginIframe: false,
        onError: () => {
          console.error('Keycloak initialization failed');
          toast.error('Falha ao inicializar Keycloak.');
        },
      }}
      onTokens={onTokens}
    >
      {children}
    </ReactKeycloakProvider>
  );
};