import { Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingScreen } from './LoadingScreen';
import { initializeAuth } from '@/utils/auth-init';

/**
 * SecuredContent
 * Componente wrapper que protege as rotas autenticadas
 * 
 * Responsabilidades:
 * 1. Verificar se o usuário está autenticado
 * 2. Restaurar autenticação do localStorage
 * 3. Processar código de autorização do Keycloak
 * 4. initializeAuth se encarrega de redirecionar para Keycloak se necessário
 */
export const SecuredContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { setTokens, isAuthenticated, user, token } = useAuthStore();

  console.log('🔍 SecuredContent render:', { isLoading, isAuthenticated, hasUser: !!user, hasToken: !!token });

  // ✅ INICIALIZAR AUTENTICAÇÃO EXATAMENTE UMA VEZ no mount
  useEffect(() => {
    console.log('📌 SecuredContent montado - iniciando autenticação...');
    
    initializeAuth({
      setIsLoading,
      setTokens,
    });
  }, []); // Dependency array vazio = executa apenas uma vez no mount

  // Se usuário e token estão no store (persistência), está autenticado
  const hasPersistedAuth = !!user && !!token;
  const hasTokenInStorage = !!localStorage.getItem('token') || !!localStorage.getItem('access_token');

  // ✅ Se está carregando, mostrar LoadingScreen
  if (isLoading) {
    console.log('⏳ Mostrando LoadingScreen...');
    return <LoadingScreen />;
  }

  // ✅ Se carregou E tem autenticação, mostrar conteúdo
  if (isAuthenticated || hasPersistedAuth || hasTokenInStorage) {
    console.log('✅ Usuário autenticado com sucesso');
    return (
      <>
        <Outlet />
      </>
    );
  }

  // Se chegou aqui sem autenticação, mostrar loading
  // initializeAuth deveria ter redirecionado para Keycloak via window.location.href
  console.log('⏳ Sem autenticação - mostrando loading (initializeAuth deve redirecionar para Keycloak)');
  return <LoadingScreen />;
};
