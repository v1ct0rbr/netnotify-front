import { ReactKeycloakProvider, useKeycloak } from "@react-keycloak/web"
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import './App.css'
import { ThemeProvider } from './components/theme-provider'
import { queryClient } from './lib/react-query'
import keycloak from "./config/keycloak"
import { useKeycloakStorageFixture } from './hooks/useKeycloakStorageFixture'
import { useKeycloakCodeExchange } from './hooks/useKeycloakCodeExchange'
import { useDebugURL } from './hooks/useDebugURL'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={{
          onLoad: 'check-sso', // Muda para 'check-sso' para NÃO redirecionar automaticamente
          checkLoginIframe: false,
          silentCheckSsoFallback: false,
          pkceMethod: 'S256',
          // Solicita que o Keycloak retorne o `code` na query string (ex: ?code=...)
          // por padrão alguns adaptadores/adapters podem usar fragment (#code=...)
          // Definir como 'query' ajuda no fluxo Authorization Code + PKCE
          responseMode: 'query',
          enableLogging: true,
        }}
      >
        <Toaster richColors closeButton />
        <QueryClientProvider client={queryClient}>
          <SecuredContent />
        </QueryClientProvider>
      </ReactKeycloakProvider>
    </ThemeProvider>
  )
}

const SecuredContent = () => {
  // Use o hook para prevenir erros de storage access
  const { keycloak, initialized } = useKeycloakStorageFixture();
  
  // Hook de debug para monitorar URL
  useDebugURL();
  
  // Extrai código da URL (pode estar em ?code= ou em #code=)
  // IMPORTANTE: Faz isso UMA VEZ quando o componente monta, não a cada render
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  const codeFromSearch = urlParams.get('code');
  const codeFromHash = hashParams.get('code');
  const code = codeFromSearch || codeFromHash;
  
  // Passa o código diretamente para o hook
  useKeycloakCodeExchange(code);
  
  console.log('🔍 [SecuredContent] Estado:', {
    search: window.location.search,
    hash: window.location.hash,
    code,
    initialized,
    authenticated: keycloak?.authenticated
  });
  
  // Se ainda está inicializando e não há código, mostra loading
  if (!initialized) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  // Se há código, deixa o hook processar (não redireciona aqui)
  if (code) {
    return <div className="flex items-center justify-center h-screen">Processando autorização...</div>;
  }

  // Se não está autenticado e não há código, redireciona para login
  if (!keycloak?.authenticated) {
    // Chama o Keycloak para fazer login
    keycloak?.login({ redirectUri: window.location.origin + window.location.pathname });
    return <div className="flex items-center justify-center h-screen">Redirecionando para login...</div>;
  }
  
  return (
    <>
      <Outlet />      
    </>
  );
};


export default App
