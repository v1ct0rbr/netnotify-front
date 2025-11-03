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

interface InitAuthParams {
  setIsLoading: (loading: boolean) => void;
  setTokens: (response: any) => void;
}

export async function initializeAuth({
  setIsLoading,
  setTokens,
}: InitAuthParams): Promise<void> {
  console.log('🚀 Inicializando autenticação...');

  // ✅ PRIMEIRO: Sincronizar localStorage com Zustand
  // Isso garante que o interceptador terá acesso ao token correto
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  const storedUser = localStorage.getItem('user');
  
  if (accessToken && storedUser) {
    console.log('🔄 [SYNC] Sincronizando tokens do localStorage para Zustand...');
    console.log('🔄 [SYNC] Access Token encontrado (primeiros 50 chars):', accessToken.substring(0, 50) + '...');
    
    try {
      const userData = JSON.parse(storedUser);
      console.log('🔄 [SYNC] Usuário encontrado:', userData.username);
      
      // Restaurar o estado no Zustand com os tokens do localStorage
      setTokens({
        accessToken,
        refreshToken: refreshToken || '',
        expiresIn: parseInt(localStorage.getItem('expires_in') || '3600'),
        tokenType: localStorage.getItem('token_type') || 'Bearer',
        user: userData,
      });
      
      console.log('✅ [SYNC] Zustand sincronizado com localStorage');
      setIsLoading(false);
      return; // Saiu da função aqui - não precisa fazer mais nada
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
    // ✅ Usar sessionStorage para persistir tentativa de exchange
    // Isso evita loops infinitos mesmo se o componente re-renderizar
    const attemptedCodesKey = 'auth_attempted_codes';
    const attemptedCodes = JSON.parse(sessionStorage.getItem(attemptedCodesKey) || '[]');
    
    if (attemptedCodes.includes(code)) {
      console.log('⚠️ Exchange deste code já foi tentado, não retentando...');
      console.log('🧹 Limpando query string da URL...');
      // Limpar a query string para evitar retry infinito
      window.history.replaceState({}, document.title, '/');
      setIsLoading(false);
      return;
    }

    console.log('🔄 Iniciando exchange do código...');
    // Registrar que vamos tentar este código
    attemptedCodes.push(code);
    sessionStorage.setItem(attemptedCodesKey, JSON.stringify(attemptedCodes));

    const redirectUri = window.location.origin + '/';
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

    console.log('📝 Código de autorização recebido:', code.substring(0, 30) + '...');
    console.log('🔑 Code verifier disponível:', !!codeVerifier);
    console.log('📤 Enviando para backend em /auth/callback...');

    try {
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

      // Limpa a query string
      window.history.replaceState({}, document.title, '/');

      // Limpar dados da sessão após sucesso
      sessionStorage.removeItem('pkce_code_verifier');
      sessionStorage.removeItem('attempted_code');

      console.log('✅ Login completo! Tokens salvos e query string limpa');
      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Erro ao fazer exchange do código');
      console.error('   Status HTTP:', error.response?.status);
      console.error('   Mensagem:', error.response?.data?.message || error.message);
      console.error('   Resposta completa:', error.response?.data);
      console.error('   Headers enviados:', error.config?.headers);
      console.error('   Payload enviado:', error.config?.data);
      
      // Limpar query string mesmo em caso de erro para evitar retry infinito
      window.history.replaceState({}, document.title, '/');
      
      setIsLoading(false);
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

    // Salvar code_verifier para depois
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);

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
