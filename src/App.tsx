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

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={{
          onLoad: 'login-required',
          checkLoginIframe: false,
          silentCheckSsoFallback: false,
          pkceMethod: 'S256',
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
  
  // Ativa o code exchange se houver código na URL
  const urlParams = new URLSearchParams(window.location.search);
  const hasCode = !!urlParams.get('code');
  useKeycloakCodeExchange(hasCode);
  
  // Se ainda está inicializando, mostra loading
  if (!initialized) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  // Se não está autenticado, retorna null (Keycloak Provider cuida do redirect)
  if (!keycloak?.authenticated) {
    return null;
  }
  
  return (
    <>
      <Outlet />      
    </>
  );
};


export default App
