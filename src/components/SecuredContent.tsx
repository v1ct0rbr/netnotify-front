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
  const { setTokens, isAuthenticated, user, token } = useAuthStore();

  console.log('🔍 SecuredContent render:', { isLoading, isAuthenticated, hasUser: !!user, hasToken: !!token });

  // ✅ SINCRONIZAÇÃO DE TOKENS NO BOOT
  useEffect(() => {
    console.log('📌 SecuredContent montado - verificando sincronização de tokens...');
    
    const accessToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    
    // Se tem token no localStorage mas não tem no Zustand, sincronizar
    if (accessToken && storedUser && !token) {
      console.log('🔄 [BOOT SYNC] Sincronizando tokens do localStorage...');
      try {
        const userData = JSON.parse(storedUser);
        setTokens({
          accessToken,
          refreshToken: localStorage.getItem('refresh_token') || '',
          expiresIn: parseInt(localStorage.getItem('expires_in') || '3600'),
          tokenType: localStorage.getItem('token_type') || 'Bearer',
          user: userData,
        });
        console.log('✅ [BOOT SYNC] Tokens sincronizados com sucesso');
      } catch (error) {
        console.error('❌ [BOOT SYNC] Erro ao sincronizar:', error);
      }
    }

    // ✅ INICIALIZAR AUTENTICAÇÃO (UMA VEZ)
    console.log('🔄 [INIT] Iniciando autenticação...');
    initializeAuth({
      setIsLoading,
      setTokens,
    });
  }, []); // Executa APENAS UMA VEZ no mount!

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
