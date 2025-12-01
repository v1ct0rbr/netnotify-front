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
    error => {
        const status = error.response?.status;
        const url: string = error.config?.url || '';

        if (status === 401 || status === 403) {
            console.error(`❌ [INTERCEPTOR RESPONSE] ${status} Auth error em:`, url);
            console.error('   Dados do erro:', error.response?.data);

            // Ignorar endpoints de autenticação para evitar loops
            const isAuthEndpoint = url.includes('/auth/callback') || url.includes('/auth/logout');

            if (!isAuthEndpoint && !isHandlingAuthError) {
                isHandlingAuthError = true;
                try {
                    console.warn('🚪 [INTERCEPTOR] Token expirado durante operação...');
                    
                    // ✅ NOVO: Salvar URL atual para redirecionar depois da reautenticação
                    // Persistir no localStorage para sobreviver ao reload
                    const currentPath = window.location.pathname + window.location.search + window.location.hash;
                    if (currentPath !== '/login' && currentPath !== '/') {
                        console.log('💾 [INTERCEPTOR] Salvando URL de redirecionamento para após reauth:', currentPath);
                        localStorage.setItem('redirect_url_after_reauth', currentPath);
                        
                        // Também salvar no store para consistência
                        const { setRedirectUrl } = useNavigationStore.getState();
                        setRedirectUrl(currentPath);
                    }
                    
                    // Chama logout do store (sem hooks)
                    const { logout } = useAuthStore.getState();
                    logout()
                        .catch((e) => console.warn('⚠️ [INTERCEPTOR] Erro ao executar logout:', e))
                        .finally(() => {
                            // Redireciona para raiz para reiniciar o fluxo (initializeAuth vai redirecionar ao Keycloak)
                            console.warn('↪️ [INTERCEPTOR] Redirecionando para / ...');
                            window.location.replace('/');
                        });
                } catch (e) {
                    console.error('❌ [INTERCEPTOR] Falha ao forçar logout:', e);
                    // fallback: limpar localmente e recarregar
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