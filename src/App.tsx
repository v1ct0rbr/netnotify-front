import { ReactKeycloakProvider, useKeycloak } from "@react-keycloak/web"
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import './App.css'
import { ThemeProvider } from './components/theme-provider'
import { queryClient } from './lib/react-query'
import keycloak from "./config/keycloak"
import api from './config/axios'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={{
          onLoad: 'check-sso',
          checkLoginIframe: false,
          silentCheckSsoFallback: false,
          pkceMethod: 'S256',
          responseMode: 'query',
          enableLogging: true,
        }}
        LoadingComponent={<LoadingScreen />}
      >
        <Toaster richColors closeButton />
        <QueryClientProvider client={queryClient}>
          <SecuredContent />
        </QueryClientProvider>
      </ReactKeycloakProvider>
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
  const { keycloak, initialized } = useKeycloak();
  
  console.log('🔍 [SecuredContent] Keycloak State:', {
    initialized,
    authenticated: keycloak?.authenticated,
    token: keycloak?.token ? '✓ Token present' : '✗ No token',
    url: window.location.href
  });

  // Hook para processar o code retornado pelo Keycloak
  useEffect(() => {
    if (!initialized) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('❌ Erro do Keycloak:', error, urlParams.get('error_description'));
      return;
    }

    if (code && !keycloak?.authenticated) {
      console.log('📝 Code recebido, preparando exchange...', code);
      
      // Extrai o code_verifier do sessionStorage (gerado automaticamente pelo Keycloak JS adapter)
      const codeVerifier = sessionStorage.getItem('PKCE_code_verifier');
      const redirectUri = window.location.origin + '/';
      
      if (!codeVerifier) {
        console.warn('⚠️ code_verifier não encontrado no sessionStorage');
      }
      
      console.log('📤 Enviando para backend:', {
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier ? '✓ Presente' : '✗ Ausente'
      });
      
      // Usa a instância do axios pré-configurada
      api.post('/auth/callback', {
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier || undefined,
      })
        .then((response: any) => {
          console.log('✅ Token recebido do backend:', response.data);
          
          // Armazena o token
          const token = response.data.access_token || response.data.token;
          localStorage.setItem('access_token', token);
          
          // Atualiza o header de autorização para futuras requisições
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Limpa a query string e o sessionStorage
          window.history.replaceState({}, document.title, window.location.pathname);
          sessionStorage.removeItem('PKCE_code_verifier');
          
          // Recarrega para processar o novo token
          window.location.reload();
        })
        .catch((error: any) => {
          console.error('❌ Erro ao fazer exchange do code:', error.response?.data || error.message);
        });
    }
  }, [initialized, keycloak?.authenticated]);
  
  if (!initialized) {
    return <LoadingScreen />;
  }

  // Se não está autenticado e não há code, faz login
  if (!keycloak?.authenticated) {
    console.log('❌ Não autenticado, tentando fazer login...');
    
    keycloak?.login({ 
      redirectUri: window.location.origin + '/',
    });
    
    return <LoadingScreen />;
  }
  
  console.log('✅ Autenticado com sucesso');
  
  return (
    <>
      <Outlet />      
    </>
  );
};

export default App
