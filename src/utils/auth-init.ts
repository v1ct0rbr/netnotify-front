/**
 * Lógica de inicialização de autenticação
 * Responsável por:
 * 1. Verificar se há token no localStorage
 * 2. Restaurar estado do store
 * 3. Processar código de autorização do Keycloak
 * 4. Redirecionar para login se necessário
 */

import api from '@/config/axios';
import { generateCodeChallenge, generateCodeVerifier, generateRandomString } from './pkce';
import { useNavigationStore } from '@/store/useNavigationStore';
import { useAuthStore } from '@/store/useAuthStore';

interface InitAuthParams {
  setIsLoading: (loading: boolean) => void;
  setTokens: (response: any) => void;
}

export async function initializeAuth({
  setIsLoading,
  setTokens,
}: InitAuthParams): Promise<void> {
  console.log('🚀 Inicializando autenticação...');
  console.log('📍 URL atual:', window.location.href);
  console.log('📍 Search (query string):', window.location.search);

  // ✅ PRIMEIRO: Sincronizar localStorage com Zustand
  // Isso garante que o interceptador terá acesso ao token correto
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  const storedUser = localStorage.getItem('user');
  
  console.log('🔐 Estado do localStorage:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasStoredUser: !!storedUser,
  });
  
  if (accessToken && storedUser) {
    try {
      const userData = JSON.parse(storedUser);

      const authState = useAuthStore.getState();
      if (authState.isAuthenticated && authState.user && authState.token === accessToken) {
        setIsLoading(false);
        return;
      }

      setTokens({
        accessToken,
        refreshToken: refreshToken || '',
        expiresIn: parseInt(localStorage.getItem('expires_in') || '3600'),
        tokenType: localStorage.getItem('token_type') || 'Bearer',
        user: userData,
      });

      setIsLoading(false);
      return;
    } catch (error) {
      console.error('❌ [SYNC] Erro ao sincronizar:', error);
    }
  }

  // ✅ SEGUNDO: Se não há dados sincronizados, continua com o flow normal
  // Verificar se há code na URL (retorno do Keycloak)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  console.log('� Estado de autenticação:', {
    token: accessToken ? '✓ Token found' : '✗ No token',
    code: code ? '✓ Code present' : '✗ No code',
  });

  if (code) {
    console.log('🔍 [CODE FOUND] Code detectado na URL:', code.substring(0, 30) + '...');
    
    // ✅ PRIMEIRO PASSO: Verificar se já existe token (user já logado!)
    // Se já tem token, então o código na URL é STALE (não processar!)
    if (accessToken && storedUser) {
      console.log('✅ [ALREADY AUTHENTICATED] User já tem token válido, ignorando código stale na URL');
      console.log('    Ação: Limpando URL e encerrando...');
      
      // Limpar a query string para evitar confusão
      window.history.replaceState({}, document.title, '/');
      setIsLoading(false);
      return;
    }

    // ✅ SEGUNDO PASSO: Usar localStorage para persistir tentativa de exchange MESMO APÓS RECARREGAR
    // sessionStorage é zerado ao recarregar, então precisa ser localStorage
    const attemptedCodesKey = 'auth_attempted_codes';
    const attemptedCodesJson = localStorage.getItem(attemptedCodesKey);
    const attemptedCodes = attemptedCodesJson ? JSON.parse(attemptedCodesJson) : [];
    
    console.log('📋 [DEDUP CHECK] Códigos já processados:', attemptedCodes.length > 0 ? attemptedCodes.map((c: string) => c.substring(0, 20) + '...') : 'nenhum');
    console.log('📋 [DEDUP CHECK] Código atual:', code.substring(0, 20) + '...');
    
    if (attemptedCodes.includes(code)) {
      console.log('⚠️ [DEDUP] Exchange deste code já foi tentado anteriormente!');
      console.log('    Code:', code.substring(0, 30) + '...');
      console.log('    Razão: Proteção contra retry infinito');
      console.log('    Ação: Limpando URL e encerrando...');
      
      // Limpar a query string para evitar retry infinito
      window.history.replaceState({}, document.title, '/');
      setIsLoading(false);
      return;
    }

    console.log('🔄 [NEW CODE] Novo código será processado agora');
    // Registrar que vamos tentar este código (em localStorage para persistir após recarregar)
    attemptedCodes.push(code);
    localStorage.setItem(attemptedCodesKey, JSON.stringify(attemptedCodes));
    console.log('💾 [SAVED] Code registrado em localStorage para evitar retry');

    const redirectUri = window.location.origin + '/';
    // ⚠️ Verificar localStorage PRIMEIRO (persiste após recarregar)
    // Depois sessionStorage (caso esteja em sessão sem recarregar)
    const codeVerifier = localStorage.getItem('__pkce_code_verifier__') 
      || sessionStorage.getItem('__pkce_code_verifier__') 
      || sessionStorage.getItem('pkce_code_verifier');

    console.log('📝 Código de autorização recebido:', code.substring(0, 30) + '...');
    console.log('🔑 Code verifier disponível:', !!codeVerifier);
    console.log('📤 Enviando para backend em /auth/callback...');

    try {
      try {
        sessionStorage.setItem('auth_exchange_in_progress', '1');
      } catch {
        // ignore
      }

      if (!codeVerifier) {
        console.warn('⚠️ code_verifier não encontrado! Backend deve ser capaz de processar sem PKCE ou...');
        console.warn('   Isso pode acontecer se a página foi recarregada após redirect do Keycloak');
        // Alguns backends conseguem processar sem o code_verifier, vamos tentar assim mesmo
      }

      const payload = {
        code,
        redirect_uri: redirectUri,
        ...(codeVerifier && { code_verifier: codeVerifier }), // Incluir apenas se existir
      };

      console.log('📤 Enviando payload:', { 
        code: code.substring(0, 30) + '...', 
        redirect_uri: redirectUri,
        hasCodeVerifier: !!codeVerifier 
      });

      console.log('🔐 Headers que serão enviados:');
      console.log('   - Content-Type:', 'application/json');
      console.log('   - Authorization:', localStorage.getItem('access_token') ? 'Bearer ...' : 'NÃO ENVIADO (não tem token)');

      const response = await api.post('/auth/callback', payload);

      console.log('✅ Resposta do backend recebida - Status:', response.status);
      console.log('✅ Dados da resposta:', response.data);

      // Axios com camelCase keys converter: access_token → accessToken
      const token = response.data.accessToken || response.data.access_token;
      if (!token) {
        throw new Error('Backend não retornou token. Resposta: ' + JSON.stringify(response.data));
      }

      // ✨ Armazenar tokens e dados do usuário no store Zustand
      console.log('📦 Salvando no Zustand store...');
      setTokens(response.data);

      // ✅ NOVO: Redirecionar para a página onde o usuário estava
      // Verificar primeiro localStorage (persiste após reauth), depois store
      let redirectUrl = localStorage.getItem('redirect_url_after_reauth');
      
      if (!redirectUrl) {
        // Fallback para o store Zustand
        const { getRedirectUrl } = useNavigationStore.getState();
        redirectUrl = getRedirectUrl();
      }
      
      if (redirectUrl) {
        console.log('📍 [Navigation] Redirecionando para URL salva:', redirectUrl);
        localStorage.removeItem('redirect_url_after_reauth'); // Limpar após usar
        const { clearRedirectUrl } = useNavigationStore.getState();
        clearRedirectUrl();
        window.history.replaceState({}, document.title, redirectUrl);
      } else {
        console.log('📍 [Navigation] Nenhuma URL salva, limpando query string');
        window.history.replaceState({}, document.title, '/');
      }

      sessionStorage.removeItem('pkce_code_verifier');
      sessionStorage.removeItem('attempted_code');

      console.log('✅ Login completo! Tokens salvos e navegação processada');
      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Erro ao fazer exchange do código');
      console.error('   Status HTTP:', error.response?.status);
      console.error('   Mensagem:', error.response?.data?.message || error.message);
      console.error('   Resposta completa:', error.response?.data);

      window.history.replaceState({}, document.title, '/');

      setIsLoading(false);
    } finally {
      try {
        sessionStorage.removeItem('auth_exchange_in_progress');
      } catch {
        // ignore
      }
    }
  } else if (!code) {
    // Sem token e sem code: redirecionar para login no Keycloak
    console.log('❌ Sem token e sem code - redirecionando para Keycloak...');

    const keycloakUrl = import.meta.env.VITE_KEYCLOAK_AUTH_SERVER_URL || 'https://testes.seukeycloak.com.br';
    const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'testes';
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'netnotify-front';
    const redirectUri = window.location.origin + '/';

    // Gerar PKCE code_challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // ⚠️ CRÍTICO: Guardar em localStorage (não sessionStorage!)
    // sessionStorage é zerado ao recarregar, então perdemos o code_verifier
    localStorage.setItem('__pkce_code_verifier__', codeVerifier);
    console.log('✅ [PKCE] Code verifier salvo em localStorage para depois do redirect');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: 'openid profile email',
      state: generateRandomString(32),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?${params}`;
    return;
  } else {
    setIsLoading(false);
  }
}
