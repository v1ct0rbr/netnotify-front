import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigationStore } from '@/store/useNavigationStore';

/*
ERR_FR_TOO_MANY_REDIRECTS: Indicates that the request was redirected too many times.
ERR_BAD_OPTION_VALUE: Occurs when an invalid value is provided for an Axios option.
ERR_BAD_OPTION: Indicates an invalid option was used in the request configuration.
ERR_NETWORK: A general network error, often due to connectivity issues or the server not responding.
ERR_DEPRECATED: Used when a deprecated feature or API is used.
ERR_BAD_RESPONSE: Indicates that the server responded with an error status code (outside the 2xx range).
ERR_BAD_REQUEST: The server returned a 400 status code, indicating a malformed request.
ERR_CANCELED: Occurs when the request is canceled using a cancel token.
ECONNABORTED: The request was aborted, often due to a timeout or page refresh during the request.
ETIMEDOUT: The request timed out.
*/



export const ErrorCodes = {
    NotFound: 404,
    BadRequest: 400,
    Unauthorized: 401,
    Forbidden: 403,
    InternalServerError: 500,
    ServiceUnavailable: 503,
    TooManyRequests: 429,
} as const;


const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api', // Base URL for the API
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Evita múltiplos logouts concorrentes quando vários requests falham ao mesmo tempo
let isHandlingAuthError = false;

// Flag para evitar refresh token concorrente
let isRefreshingToken = false;
let refreshTokenPromise: Promise<string | null> | null = null;

/**
 * Tenta fazer refresh do token usando o refresh token
 * Se bem-sucedido, atualiza localStorage e retorna o novo token
 * Se falhar, retorna null
 */
async function refreshAccessToken(): Promise<string | null> {
  // Se já está fazendo refresh, aguardar o resultado
  if (isRefreshingToken && refreshTokenPromise) {
    return refreshTokenPromise;
  }

  // Criar a promise de refresh
  refreshTokenPromise = (async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      console.warn('⚠️ [REFRESH] Sem refresh_token no localStorage');
      return null;
    }

    isRefreshingToken = true;
    console.log('🔄 [REFRESH] Tentando fazer refresh do token...');
    console.log('   Refresh token (primeiros 50 chars):', refreshToken.substring(0, 50) + '...');

    try {
      // Criar uma instância do axios sem interceptadores para evitar loops
      const simpleAxios = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const payload = {
        refreshToken: refreshToken,
      };

      console.log('📤 [REFRESH] Enviando payload para /auth/refresh');

      const response = await simpleAxios.post('/auth/refresh', payload);

      console.log('✅ [REFRESH] Resposta recebida:', response.status);
      console.log('   Response data:', response.data);

      // Backend retorna KeycloakTokenResponse com accessToken
      const newAccessToken = response.data.accessToken || response.data.access_token;
      
      if (newAccessToken) {
        console.log('✅ [REFRESH] Token renovado com sucesso');
        console.log('   Novo token (primeiros 50 chars):', newAccessToken.substring(0, 50) + '...');
        localStorage.setItem('access_token', newAccessToken);
        
        // Atualizar também o expiresIn se recebido
        if (response.data.expiresIn) {
          localStorage.setItem('expires_in', String(response.data.expiresIn));
        }
        
        // Atualizar o novo refreshToken se o backend retornar um
        if (response.data.refreshToken) {
          localStorage.setItem('refresh_token', response.data.refreshToken);
          console.log('✅ [REFRESH] Novo refresh token também atualizado');
        }
        
        return newAccessToken;
      }

      console.warn('⚠️ [REFRESH] Backend não retornou novo token');
      console.warn('   Response data:', response.data);
      return null;
    } catch (error: any) {
      console.error('❌ [REFRESH] Falha ao fazer refresh:', error.message);
      console.error('   Status:', error.response?.status);
      console.error('   Dados:', error.response?.data);
      console.error('   Config:', error.config);
      return null;
    } finally {
      isRefreshingToken = false;
      refreshTokenPromise = null;
    }
  })();

  return refreshTokenPromise;
}

api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    
    console.log(`🌐 [INTERCEPTOR] ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`   Payload enviado:`, config.data);
    
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ [INTERCEPTOR] Authorization header adicionado');
        console.log('   Token (primeiros 50 chars):', token.substring(0, 50) + '...');
    } else {
        console.warn('⚠️ [INTERCEPTOR] ⚠️ NENHUM TOKEN ENCONTRADO EM localStorage!');
        console.warn('   localStorage keys:', Object.keys(localStorage));
    }
    
    // ✅ NÃO converter request para camelCase
    // Enviamos os dados exatamente como estão para o backend (em snake_case)
    
    return config;
});

api.interceptors.response.use(
    response => {
        console.log(`✅ [INTERCEPTOR RESPONSE] ${response.status} ${response.config.url}`);
        response.data = camelcaseKeys(response.data, { deep: true });
        return response;
    },
    async error => {
        const status = error.response?.status;
        const url: string = error.config?.url || '';

        if (status === 401 || status === 403) {
            console.error(`❌ [INTERCEPTOR RESPONSE] ${status} Auth error em:`, url);
            console.error('   Dados do erro:', error.response?.data);

            // Ignorar endpoints de autenticação para evitar loops
            const isAuthEndpoint = url.includes('/auth/callback') || url.includes('/auth/logout') || url.includes('/auth/refresh');

            if (!isAuthEndpoint && !isHandlingAuthError) {
                // Tentar fazer refresh do token em caso de 401
                if (status === 401 && !isRefreshingToken) {
                    console.log('🔄 [INTERCEPTOR] 401 Detectado - Tentando fazer refresh do token...');
                    const newToken = await refreshAccessToken();
                    
                    if (newToken) {
                        console.log('✅ [INTERCEPTOR] Token renovado com sucesso, retentando request original');
                        // Atualizar o token na requisição original
                        error.config.headers.Authorization = `Bearer ${newToken}`;
                        // Retentar a requisição original
                        return api.request(error.config);
                    } else {
                        console.log('❌ [INTERCEPTOR] Refresh falhou - prosseguindo para logout');
                    }
                }

                // Se refresh falhou ou não é 401, fazer logout
                isHandlingAuthError = true;
                try {
                    console.warn('🚪 [INTERCEPTOR] Token inválido/expirado durante operação...');
                    
                    // ✅ Salvar URL atual para redirecionar depois da reautenticação
                    const currentPath = window.location.pathname + window.location.search + window.location.hash;
                    if (currentPath !== '/login' && currentPath !== '/') {
                        console.log('💾 [INTERCEPTOR] Salvando URL de redirecionamento para após reauth:', currentPath);
                        localStorage.setItem('redirect_url_after_reauth', currentPath);
                        
                        // Também salvar no store para consistência
                        const { setRedirectUrl } = useNavigationStore.getState();
                        setRedirectUrl(currentPath);
                    }
                    
                    // Chama logout do store
                    const { logout } = useAuthStore.getState();
                    logout()
                        .catch((e) => console.warn('⚠️ [INTERCEPTOR] Erro ao executar logout:', e))
                        .finally(() => {
                            console.warn('↪️ [INTERCEPTOR] Redirecionando para / ...');
                            window.location.replace('/');
                        });
                } catch (e) {
                    console.error('❌ [INTERCEPTOR] Falha ao forçar logout:', e);
                    // fallback
                    try {
                        localStorage.clear();
                        sessionStorage.clear();
                    } catch {}
                    window.location.replace('/');
                }
            }
        } else {
            console.error(`❌ [INTERCEPTOR RESPONSE] ${status}:`, error.message);
        }
        return Promise.reject(error);
    }
);

export default api;