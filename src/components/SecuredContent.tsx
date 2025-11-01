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
  const [isLoading, setIsLoading] = useState(true);
  const [hasAttemptedCodeExchange, setHasAttemptedCodeExchange] = useState(false);
  const { setTokens, isAuthenticated } = useAuthStore();

  console.log('🔍 SecuredContent render:', { isLoading, isAuthenticated });

  useEffect(() => {
    initializeAuth({
      setIsLoading,
      setHasAttemptedCodeExchange,
      hasAttemptedCodeExchange,
      setTokens,
    });
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
