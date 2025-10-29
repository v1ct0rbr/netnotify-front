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
 * 3. Este hook extrai o código
 * 4. Envia para o backend trocar por JWT
 * 5. Backend retorna JWT customizado
 * 6. Frontend armazena JWT e redireciona
 * 
 * @param enabled - Se true, ativa o processamento. Default: false
 */
export const useKeycloakCodeExchange = (enabled: boolean = false) => {
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      console.log('⚠️ useKeycloakCodeExchange desativado');
      return;
    }

    if (processedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) {
      console.log('ℹ️ Nenhum código de autorização na URL');
      return;
    }

    processedRef.current = true;

    (async () => {
      try {
        console.log('🔄 [Code Exchange] Iniciando troca de código...');
        console.log('📋 Código:', code.substring(0, 20) + '...');

        // Chama o serviço de autenticação para trocar código por token
        const response = await authService.exchangeCodeForToken(code);

        console.log('✅ [Code Exchange] Token recebido com sucesso');
        console.log('⏱️ Token expira em:', response.expires_in, 'segundos');

        // Limpa URL (remove código)
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        toast.success('✅ Autenticado com sucesso!');

        // Redireciona para home
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } catch (error: any) {
        console.error(
          '❌ [Code Exchange] Erro:',
          error.response?.data || error.message
        );

        const errorMsg =
          error.response?.data?.message || 'Falha ao processar autorização.';
        toast.error(errorMsg);

        // Limpa URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Redireciona para login
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1000);
      }
    })();
  }, [enabled, navigate]);
};
