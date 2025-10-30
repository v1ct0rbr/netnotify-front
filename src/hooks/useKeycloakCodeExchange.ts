import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '../services/AuthService';

/**
 * Hook que processa o OAuth2 Authorization Code Flow do Keycloak
 * 
 * Fluxo:
 * 1. Usuário faz login no Keycloak
 * 2. Keycloak retorna código de autorização na URL
 * 3. Este hook recebe o código como parâmetro
 * 4. Envia para o backend trocar por token
 * 5. Backend retorna JWT customizado
 * 6. Frontend armazena JWT e redireciona
 * 
 * @param code - Código de autorização retornado pelo Keycloak (ou null/undefined)
 */
export const useKeycloakCodeExchange = (code: string | null | undefined) => {
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    // Se não tem código, não faz nada
    if (!code) {
      console.log('ℹ️ [useKeycloakCodeExchange] Sem código para processar');
      return;
    }

    // Se já processou, não tenta novamente
    if (processedRef.current) {
      console.log('⏭️ [useKeycloakCodeExchange] Já processado anteriormente');
      return;
    }

    console.log('🔍 [useKeycloakCodeExchange] Processando código:', code.substring(0, 30) + '...');

    // Marca como processado ANTES de iniciar a troca
    processedRef.current = true;

    // Processa o código
    (async () => {
      try {
        console.log('🔄 [Code Exchange] Iniciando...');

        // Chama o serviço de autenticação para trocar código por token
        const response = await authService.exchangeCodeForToken(code);

        console.log('✅ [Code Exchange] Sucesso! Token válido por', response.expires_in, 's');

        // Limpa URL (remove código)
        window.history.replaceState({}, document.title, window.location.pathname);

        toast.success('✅ Autenticado com sucesso!');

        // Redireciona para home
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 300);
      } catch (error: any) {
        console.error('❌ [Code Exchange] Erro:', error.response?.data?.message || error.message);

        const errorMsg = error.response?.data?.message || 'Falha ao processar autorização.';
        toast.error(errorMsg);

        // Limpa URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Redireciona para login
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1000);
      }
    })();
  }, [code, navigate]);
};
