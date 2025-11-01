import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import './App.css'
import { ThemeProvider } from './components/theme-provider'
import { queryClient } from './lib/react-query'
import api from './config/axios'
import { useAuthStore } from '@/store/useAuthStore'

function App() {
  console.log('🚀 App iniciando - OAuth2 PKCE flow');

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Toaster richColors closeButton />
      <QueryClientProvider client={queryClient}>
        <SecuredContent />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-foreground">Carregando...</p>
    </div>
  </div>
);

const SecuredContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttemptedCodeExchange, setHasAttemptedCodeExchange] = useState(false);
  const { setTokens, isAuthenticated } = useAuthStore();

  console.log('🔍 SecuredContent render:', { isLoading, isAuthenticated });

  useEffect(() => {
    const initAuth = async () => {
      console.log('🚀 Inicializando autenticação...');

      // Verificar se já temos token no localStorage
      const existingToken = localStorage.getItem('token') || localStorage.getItem('access_token');
      console.log('🔑 existingToken:', existingToken ? 'presente' : 'ausente');
      
      if (existingToken) {
        console.log('✅ Token encontrado no localStorage');
        api.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
        
        // Recuperar dados do usuário do localStorage
        const storedUser = localStorage.getItem('user');
        const storedRefreshToken = localStorage.getItem('refresh_token');
        const storedExpiresIn = localStorage.getItem('expires_in');
        const storedTokenType = localStorage.getItem('token_type');
        
        console.log('👤 storedUser:', storedUser ? 'presente' : 'ausente');
        
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('🔄 Chamando setTokens com dados:', userData);
            // Restaurar o estado de autenticação no store
            setTokens({
              accessToken: existingToken,
              refreshToken: storedRefreshToken || '',
              expiresIn: storedExpiresIn ? parseInt(storedExpiresIn) : 3600,
              tokenType: storedTokenType || 'Bearer',
              user: userData
            });
            console.log('✅ Estado de autenticação restaurado do localStorage');
          } catch (e) {
            console.error('❌ Erro ao restaurar dados do usuário:', e);
          }
        } else {
          console.log('⚠️ Nenhum usuário armazenado no localStorage');
        }
        
        setIsLoading(false);
        return;
      }

      // Verificar se há code na URL (retorno do Keycloak)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      console.log('🔍 Estado de autenticação:', {
        token: existingToken ? '✓ Token found' : '✗ No token',
        code: code ? '✓ Code present' : '✗ No code',
        hasAttemptedCodeExchange,
      });

      if (code && !hasAttemptedCodeExchange) {
        // Verificar se já tentamos fazer exchange deste code
        const previouslyAttemptedCode = sessionStorage.getItem('attempted_code');
        if (previouslyAttemptedCode === code) {
          console.log('⚠️ Exchange deste code já foi tentado (pode ter falhado), não retentando...');
          setHasAttemptedCodeExchange(true);
          setIsLoading(false);
          return;
        }

        setHasAttemptedCodeExchange(true);
        sessionStorage.setItem('attempted_code', code);

        const redirectUri = window.location.origin + '/';
        const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

        console.log('📝 Código de autorização recebido:', code.substring(0, 30) + '...');
        console.log('🔑 Code verifier disponível:', !!codeVerifier);
        console.log('📤 Enviando para backend em /auth/callback...');

        try {
          if (!codeVerifier) {
            throw new Error('code_verifier não encontrado no sessionStorage');
          }

          const response = await api.post('/auth/callback', {
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          });

          console.log('✅ Resposta do backend recebida:', response.data);

          // Axios com camelCase keys converter: access_token → accessToken
          const token = response.data.accessToken || response.data.access_token;
          if (!token) {
            throw new Error('Backend não retornou token. Resposta: ' + JSON.stringify(response.data));
          }

          // ✨ Armazenar tokens e dados do usuário no store Zustand
          console.log('📦 Salvando no Zustand store...');
          setTokens(response.data);

          // Limpa a query string
          window.history.replaceState({}, document.title, '/');

          // Limpar dados da sessão após sucesso
          sessionStorage.removeItem('pkce_code_verifier');
          sessionStorage.removeItem('attempted_code');

          setIsLoading(false);
        } catch (error: any) {
          console.error(
            '❌ Erro ao fazer exchange do código:',
            error.response?.data?.message || error.message
          );
          console.error('Full error:', error);
          setIsLoading(false);
        }
      } else if (!code && !existingToken) {
        // Sem token e sem code: redirecionar para login no Keycloak
        console.log('🔗 Redirecionando para Keycloak...');

        const keycloakUrl = import.meta.env.VITE_KEYCLOAK_AUTH_SERVER_URL || 'https://testes.seukeycloak.com.br';
        const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'testes';
        const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'netnotify-front';
        const redirectUri = window.location.origin + '/';

        // Gerar PKCE code_challenge
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        // Salvar code_verifier para depois
        sessionStorage.setItem('pkce_code_verifier', codeVerifier);

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          response_mode: 'query',
          scope: 'openid profile email',
          state: generateRandomString(32),
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });

        window.location.href = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?${params}`;
        return;
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [hasAttemptedCodeExchange, setTokens]);

  // Re-renderizar quando isAuthenticated muda
  useEffect(() => {
    console.log('🔄 isAuthenticated mudou para:', isAuthenticated);
  }, [isAuthenticated]);

  const hasTokenInStorage = !!localStorage.getItem('token') || !!localStorage.getItem('access_token');

  if (isLoading && !hasTokenInStorage) {
    return <LoadingScreen />;
  }

  // Se temos token no storage mas isAuthenticated ainda não atualizou, mesmo assim renderizar
  // Porque setTokens foi chamado e vai atualizar o store em breve
  if (!isAuthenticated && !hasTokenInStorage) {
    return <LoadingScreen />;
  }

  console.log('✅ Usuário autenticado com sucesso');

  return (
    <>
      <Outlet />
    </>
  );
};

// Utility functions para PKCE
function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateCodeVerifier(): string {
  return generateRandomString(128);
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export default App
