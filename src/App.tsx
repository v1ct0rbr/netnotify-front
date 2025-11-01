import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import './App.css';
import { ThemeProvider } from './components/theme-provider';
import { queryClient } from './lib/react-query';
import { SecuredContent } from './components/SecuredContent';

/**
 * App
 * Componente raiz da aplicação
 * 
 * Configura os providers necessários:
 * - ThemeProvider: Tema claro/escuro
 * - QueryClientProvider: React Query
 * - Toaster: Notificações Sonner
 * - SecuredContent: Proteção de rotas autenticadas
 */
function App() {
  console.log('🚀 App iniciando - OAuth2 PKCE flow');

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Toaster richColors closeButton />
      <QueryClientProvider client={queryClient}>
        <SecuredContent />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
