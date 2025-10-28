# 🔐 Fluxo de Autenticação Keycloak com Exchange no Backend

## Visão Geral do Fluxo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUÁRIO NO FRONTEND                          │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │ 1. Clica em "Entrar com Keycloak"
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                  │
│  - LoginForm dispara keycloak.login()                               │
│  - Redireciona para Keycloak OAuth2 authorization endpoint          │
└─────────────────────────────────────────────────────────────────────┘
                               │
                    2. OAuth2 Authorization Request
                      (client_id, scope, redirect_uri)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    KEYCLOAK SERVER                                   │
│  - Exibe tela de login                                              │
│  - Usuário insere credenciais                                       │
│  - Valida e retorna authorization code                              │
└─────────────────────────────────────────────────────────────────────┘
                               │
         3. Redireciona para o Frontend COM o authorization code
            http://localhost:5173/auth/login
               #code=...&state=...&session_state=...
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                  │
│  - useKeycloakCodeExchange Hook detecta o 'code'                    │
│  - Extrai: code, state, session_state                               │
│  - Faz POST para /api/auth/keycloak/exchange                        │
│    com { code, state, session_state, redirectUri }                  │
└─────────────────────────────────────────────────────────────────────┘
                               │
           4. Envia authorization code para o Backend
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Spring)                                  │
│  POST /api/auth/keycloak/exchange                                   │
│                                                                      │
│  Step 1: Recebe { code, state, session_state, redirectUri }        │
│  Step 2: Faz Token Request para Keycloak                           │
│          POST /realms/testes/protocol/openid-connect/token        │
│            - client_id = netnotify-frontend                         │
│            - client_secret = <secret>                               │
│            - grant_type = authorization_code                        │
│            - code = <codigo recebido>                               │
│            - redirect_uri = http://localhost:5173/auth/login       │
│                                                                      │
│  Step 3: Keycloak retorna { access_token, refresh_token, ... }     │
│  Step 4: Extrai user info do access_token (username, email, name)  │
│  Step 5: Sincroniza com DB (cria ou atualiza usuário)              │
│  Step 6: Gera JWT customizado da aplicação                         │
│  Step 7: Retorna { token, user } para o frontend                   │
└─────────────────────────────────────────────────────────────────────┘
                               │
        5. Retorna JWT + User Profile
         { token: "jwt...", user: {...} }
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                  │
│  - Armazena JWT no localStorage                                     │
│  - Configura header Authorization: Bearer <jwt>                     │
│  - Faz GET /profile/me para validar                                 │
│  - Atualiza auth store (setUser, setToken)                          │
│  - Limpa parâmetros da URL                                          │
│  - Redireciona para dashboard/home                                  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    USUÁRIO AUTENTICADO ✓                             │
│  - JWT armazenado e disponível em todas as requests                 │
│  - Backend gerencia a sessão do usuário                             │
│  - Keycloak e aplicação sincronizados                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## O que muda na sua aplicação?

### 1. **Frontend: useKeycloakCodeExchange Hook** ✅ CRIADO
- Detecta quando Keycloak redireciona com `?code=...`
- Extrai: `code`, `state`, `session_state`
- Chama seu backend com: POST `/api/auth/keycloak/exchange`

### 2. **Backend: KeycloakController** (EXEMPLO FORNECIDO)
```java
@PostMapping("/keycloak/exchange")
public ResponseEntity<AuthResponse> exchangeKeycloakCode(
    @RequestBody KeycloakExchangeRequest request
)
```
- Recebe o authorization code
- Faz token exchange com Keycloak
- Retorna JWT + User Profile

### 3. **Backend: KeycloakService** (EXEMPLO FORNECIDO)
A service que faz o "pesado":
- **getTokenFromKeycloak()** - Faz token request para Keycloak
- **extractUserInfoFromToken()** - Extrai dados do usuário
- **syncUserWithKeycloak()** - Sincroniza com seu DB
- **generateCustomJWT()** - Gera JWT da sua aplicação

### 4. **DTOs** (EXEMPLOS FORNECIDOS)
- `KeycloakExchangeRequest` - O que o frontend envia
- `KeycloakTokenResponse` - O que Keycloak retorna

---

## Configuração no Backend (application.yml ou .properties)

```yaml
keycloak:
  server-url: https://keycloak.derpb.com.br
  realm: testes
  client-id: netnotify-frontend
  client-secret: ${KEYCLOAK_CLIENT_SECRET}  # Configure isso!

app:
  jwt:
    secret: ${JWT_SECRET}  # Sua chave para assinar JWTs customizados
```

---

## O fluxo da URL que chega:

Antes (sem exchange):
```
http://localhost:5173/auth/login#state=60747c58...&session_state=392f0f93...&code=fd18bfeb...
```

O que acontecia: Nada! O @react-keycloak/web não processava

Agora (com exchange):
```
http://localhost:5173/auth/login#state=60747c58...&session_state=392f0f93...&code=fd18bfeb...
     │
     └─> useKeycloakCodeExchange Hook detecta #code=...
         └─> Envia para /api/auth/keycloak/exchange
             └─> Backend faz exchange com Keycloak
                 └─> Retorna JWT
                     └─> Frontend armazena e redireciona
```

---

## Resumo das mudanças necessárias:

### ✅ Frontend (Já feito)
- [x] Criado `useKeycloakCodeExchange.ts` hook
- [x] Atualizado `LoginPage.tsx` para usar o hook

### ⚠️ Backend (Você precisa implementar)
- [ ] Criar `KeycloakController.java`
- [ ] Criar `KeycloakService.java`
- [ ] Criar `KeycloakExchangeRequest.java` DTO
- [ ] Criar `KeycloakTokenResponse.java` DTO
- [ ] Atualizar `application.yml` com credenciais Keycloak
- [ ] Adicionar dependência: `org.springframework.security.oauth:spring-security-oauth2`

### ⚙️ Configuração
- [ ] Configurar credenciais Keycloak:
  - `keycloak.server-url`: https://keycloak.derpb.com.br
  - `keycloak.realm`: testes
  - `keycloak.client-id`: netnotify-frontend
  - `keycloak.client-secret`: (peça ao admin do Keycloak)

---

## Teste o fluxo:

1. **Frontend**: `npm run dev`
2. **Backend**: Inicie a aplicação Spring
3. **Acesse**: http://localhost:5173/auth/login
4. **Clique**: "Entrar com Keycloak"
5. **Valide**: Você será redirecionado para o dashboard após autenticação

---

## Próximos passos:

Se precisar, posso ajudar com:
- ✅ Implementação do backend (código Java completo e funcional)
- ✅ Configuração do Keycloak (realms, clients, etc)
- ✅ Refresh token automático antes de expirar
- ✅ Testes da integração
- ✅ Error handling e fallbacks
