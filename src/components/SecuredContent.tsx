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
 * 4. Redirecionar para login se necessário
 */
export const SecuredContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedCodeExchange, setHasAttemptedCodeExchange] = useState(false);
  const { setTokens, isAuthenticated, user, token } = useAuthStore();

  console.log('🔍 SecuredContent render:', { isLoading, isAuthenticated, hasUser: !!user, hasToken: !!token });

  useEffect(() => {
    initializeAuth({
      setIsLoading,
      setHasAttemptedCodeExchange,
      hasAttemptedCodeExchange,
      setTokens,
    });
    // IMPORTANTE: Não adicionar setTokens como dependência!
    // setTokens é uma função do Zustand que muda a cada render
    // Isso causaria um loop infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAttemptedCodeExchange]);

  // Re-renderizar quando isAuthenticated muda
  useEffect(() => {
    console.log('🔄 isAuthenticated mudou para:', isAuthenticated);
  }, [isAuthenticated]);

  // Se usuário e token estão no store (persistência), não precisa carregar
  const hasPersistedAuth = !!user && !!token;
  const hasTokenInStorage = !!localStorage.getItem('token') || !!localStorage.getItem('access_token');

  if (isLoading && !hasPersistedAuth && !hasTokenInStorage) {
    return <LoadingScreen />;
  }

  // Se não está autenticado e não tem token persistido, redirecionar para login
  if (!isAuthenticated && !hasPersistedAuth && !hasTokenInStorage) {
    return <LoadingScreen />;
  }

  console.log('✅ Usuário autenticado com sucesso');

  return (
    <>
      <Outlet />
    </>
  );
};
