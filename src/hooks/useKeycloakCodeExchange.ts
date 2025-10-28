import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/config/axios';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Hook que processa o OAuth2 Authorization Code do Keycloak
 * Quando Keycloak redireciona com ?code=..., este hook faz o exchange com o backend
 */
export const useKeycloakCodeExchange = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const params = new URLSearchParams(location.search + location.hash);
    const code = params.get('code');
    const state = params.get('state');
    const sessionState = params.get('session_state');
    const redirectTo = params.get('redirect') || '/';

    if (!code) return;

    processedRef.current = true;

    (async () => {
      try {
        console.log('[keycloak-exchange] Processing authorization code:', {
          code: code.substring(0, 20) + '...',
          state: state?.substring(0, 20) + '...',
          sessionState: sessionState?.substring(0, 20) + '...',
        });

        // Faz o exchange do code pelo JWT no backend
        const res = await api.post(
          '/auth/keycloak/exchange',
          {
            code,
            state,
            session_state: sessionState,
            redirectUri: window.location.origin + '/auth/login',
          },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!res.data?.token) {
          toast.error('Erro: Token não recebido do servidor.');
          console.error('No token in response:', res.data);
          return;
        }

        // Armazena token e configura header
        const token = res.data.token;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Sync com backend para validar e obter user profile
        const profileRes = await api.get('/profile/me');
        if (profileRes.data?.user) {
          setUser(profileRes.data.user);
          setToken(token);
          toast.success('Autenticado com Keycloak com sucesso!');

          // Limpa os parâmetros da URL e redireciona
          window.history.replaceState({}, document.title, '/');
          navigate(redirectTo, { replace: true });
        } else {
          toast.error('Falha ao carregar perfil do usuário.');
        }
      } catch (err: any) {
        console.error('[keycloak-exchange] Error:', err.response?.data || err.message);
        const errorMsg =
          err.response?.data?.message ||
          'Falha ao processar autorização do Keycloak.';
        toast.error(errorMsg);

        // Limpa URL com parametros de erro
        window.history.replaceState({}, document.title, '/');
      }
    })();
  }, [location.search, location.hash, navigate, setUser, setToken]);
};
