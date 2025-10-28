# 📋 Guia de Implementação: Keycloak OAuth2 Code Exchange

## 1️⃣ FRONTEND - Já está pronto!

Os seguintes arquivos foram criados/atualizados:

✅ **`src/hooks/useKeycloakCodeExchange.ts`** (NOVO)
- Hook que detecta o authorization code na URL
- Faz POST para `/api/auth/keycloak/exchange`
- Processa o JWT retornado
- Redireciona para dashboard

✅ **`src/pages/Login/index.tsx`** (ATUALIZADO)
- Agora usa o `useKeycloakCodeExchange()` hook
- Processa tanto OAuth2 code quanto JWT URL params

---

## 2️⃣ BACKEND - Passo a passo

### Step 1: Adicionar Dependências (pom.xml)

```xml
<!-- JWT Generation and Validation -->
<dependency>
    <groupId>com.auth0</groupId>
    <artifactId>java-jwt</artifactId>
    <version>4.4.0</version>
</dependency>

<!-- OAuth2 e REST Client (já deve ter Spring Web) -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
    <version>4.0.4</version>
</dependency>

<!-- Jackson para JSON parsing -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <!-- Versão gerenciada pelo Spring Boot -->
</dependency>
```

### Step 2: Configuração (application.yml)

```yaml
keycloak:
  server-url: https://keycloak.derpb.com.br
  realm: testes
  client-id: netnotify-frontend
  client-secret: ${KEYCLOAK_CLIENT_SECRET}  # Variável de ambiente

app:
  jwt:
    secret: ${JWT_SECRET}                    # Variável de ambiente
    issuer: netnotify
    expiration-ms: 3600000                   # 1 hora em ms
```

### Step 3: Variáveis de Ambiente

Defina em seu `.env` ou no ambiente de deploy:

```bash
# Keycloak (Configurado no Keycloak Admin Console)
KEYCLOAK_CLIENT_SECRET=xxx-yyy-zzz

# JWT Secret (Gere algo como: openssl rand -base64 32)
JWT_SECRET=base64encodedSecretKeyOfAtLeast32Bytes
```

### Step 4: Criar o RestTemplate Bean

Se você ainda não tem um RestTemplate bean, crie em sua classe de configuração:

```java
package com.netnotify.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestClientConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(java.time.Duration.ofSeconds(5))
            .setReadTimeout(java.time.Duration.ofSeconds(10))
            .build();
    }
}
```

### Step 5: Copiar os arquivos de exemplo

Copie os seguintes arquivos para seu projeto:

- `BACKEND_EXAMPLE_KeycloakController.java` 
  → `src/main/java/com/netnotify/auth/controller/KeycloakController.java`

- `BACKEND_EXAMPLE_KeycloakService_COMPLETO.java`
  → `src/main/java/com/netnotify/auth/service/KeycloakService.java`

- `BACKEND_EXAMPLE_KeycloakExchangeRequest.java`
  → `src/main/java/com/netnotify/auth/dto/KeycloakExchangeRequest.java`

- `BACKEND_EXAMPLE_KeycloakTokenResponse.java`
  → `src/main/java/com/netnotify/auth/dto/KeycloakTokenResponse.java`

### Step 6: Adaptar para seu projeto

Você precisa ter/criar:

```java
// User entity (provavelmente já existe)
package com.netnotify.user.model;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue
    private Long id;
    
    private String username;
    private String email;
    private String fullName;
    private String authProvider;  // "keycloak", "ldap", "password"
    private boolean enabled;
    
    @ManyToMany
    @JoinTable(...)
    private Set<Role> roles;
    
    // getters e setters
}
```

```java
// UserRepository
package com.netnotify.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
```

```java
// Role entity (se aplicável)
@Entity
public class Role {
    @Id
    private Long id;
    private String name;  // "ROLE_SUPER", "ROLE_USER", etc
    // ...
}
```

```java
// AuthResponse DTO
package com.netnotify.auth.dto;

import com.netnotify.user.model.User;

public class AuthResponse {
    private String token;
    private User user;
    private String message;
    
    public AuthResponse(String token, User user, String message) {
        this.token = token;
        this.user = user;
        this.message = message;
    }
    // getters
}
```

---

## 3️⃣ CONFIGURAÇÃO NO KEYCLOAK

### Criar Client no Keycloak Admin Console

1. Acesse: https://keycloak.derpb.com.br/admin/
2. Selecione realm: **testes**
3. Menu esquerdo → Clients → Create
4. Preencha:
   - **Client ID**: `netnotify-frontend`
   - **Client Protocol**: `openid-connect`
   - **Root URL**: `http://localhost:5173`

5. Abra o client e configure:

**Access Type:**
```
Access Type: public
Standard Flow Enabled: ON
Implicit Flow Enabled: OFF
```

**Valid Redirect URIs:**
```
http://localhost:5173/auth/login
http://localhost:5173/auth/login#*
https://seu-dominio-producao.com/auth/login
https://seu-dominio-producao.com/auth/login#*
```

**Valid Post Logout Redirect URIs:**
```
http://localhost:5173/auth/login
https://seu-dominio-producao.com/auth/login
```

**Web Origins:**
```
http://localhost:5173
https://seu-dominio-producao.com
```

6. Se precisar fazer token exchange no backend (confidential), crie um **Credentials** e configure:
   - Acesse aba "Credentials"
   - Copie o **Secret**
   - Defina no `.env`: `KEYCLOAK_CLIENT_SECRET=<seu-secret>`

---

## 4️⃣ TESTANDO O FLUXO

### Teste 1: OAuth2 Code Exchange

```bash
# 1. Frontend inicia o fluxo
curl http://localhost:5173/auth/login

# 2. Você é redirecionado para Keycloak
# 3. Faz login
# 4. Keycloak redireciona com o code:
# http://localhost:5173/auth/login#code=...&state=...

# 5. Frontend detecta e chama o backend
curl -X POST http://localhost:8080/api/auth/keycloak/exchange \
  -H "Content-Type: application/json" \
  -d '{
    "code": "fd18bfeb-6c94-4a01-9caf-31ec0c4b0f03.392f0f93...",
    "state": "60747c58-c1ec-4266-bc71-ab358d70a81e",
    "session_state": "392f0f93-638a-42f7-8beb-1eecb0b21933",
    "redirectUri": "http://localhost:5173/auth/login"
  }'

# 6. Resposta esperada:
# {
#   "token": "eyJhbGc...",
#   "user": {
#     "id": 1,
#     "username": "seu_usuario",
#     "email": "seu_usuario@example.com",
#     "fullName": "Seu Nome Completo",
#     "roles": [...]
#   },
#   "message": null
# }
```

### Teste 2: Validar JWT

```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:8080/api/profile/me
```

---

## 5️⃣ LOGS E TROUBLESHOOTING

Se algo não funcionar, procure nos logs:

```bash
# Frontend
npm run dev  # Veja o console do browser (F12)

# Backend
# Os logs mostram o progresso passo a passo:
# ▶️ Iniciando exchange do authorization code
#   [1/5] Fazendo token request para Keycloak...
#   [2/5] Token obtido: eyJhbGc...
#   [3/5] Extraindo informações do usuário...
#   [4/5] Sincronizando usuário com banco de dados...
#   [5/5] Gerando JWT da aplicação...
# ✅ Exchange completado com sucesso para usuário: seu_usuario
```

---

## 6️⃣ FLUXO VISUAL NA PRÁTICA

```
┌──────────────┐
│   Frontend   │
│ (React)      │
└──────┬───────┘
       │
       │ 1. Clica em "Login com Keycloak"
       │
       ▼
   ┌─────────────────────┐
   │  Keycloak Server    │
   │  keycloak.derpb...  │
   └─────────────────────┘
       │
       │ 2. Redireciona com código
       │    #code=fd18bfeb...&state=60747c58...
       │
       ▼
   ┌──────────────────────┐
   │  Frontend Login Page  │
   │  useKeycloakCode...  │
   │  Exchange Hook       │
   └──────┬───────────────┘
          │
          │ 3. POST /api/auth/keycloak/exchange
          │    { code, state, sessionState, redirectUri }
          │
          ▼
   ┌─────────────────────────┐
   │  Backend Spring Boot    │
   │  KeycloakController     │
   └──────┬──────────────────┘
          │
          │ 4. Token Request para Keycloak
          │
          ▼
   ┌─────────────────────┐
   │  Keycloak Token EP  │
   └──────┬──────────────┘
          │
          │ 5. Retorna access_token
          │
          ▼
   ┌─────────────────────────┐
   │  KeycloakService        │
   │  getTokenFromKeycloak() │
   │  extractUserInfo()      │
   │  syncUserWithDB()       │
   │  generateCustomJWT()    │
   └──────┬──────────────────┘
          │
          │ 6. Retorna { token, user }
          │
          ▼
   ┌──────────────────────┐
   │  LoginPage           │
   │  Armazena JWT        │
   │  Redireciona         │
   └──────────────────────┘
```

---

## 7️⃣ PRÓXIMOS PASSOS (Opcional)

- [ ] Implementar refresh token automático
- [ ] Adicionar logout via Keycloak
- [ ] Configurar MFA (Multi-Factor Auth) no Keycloak
- [ ] Sincronizar roles do Keycloak com banco de dados
- [ ] Implementar SSO para múltiplos serviços
- [ ] Configurar LDAP backend no Keycloak

---

## 📞 Dúvidas comuns

**P: O código expira?**
A: Sim, geralmente em 10-15 minutos. Se expirar, redirecione novamente para /auth/login.

**P: E se o Keycloak estiver indisponível?**
A: Implemente fallback para login tradicional (usuário/senha) que já existe.

**P: Como revogare o token?**
A: No banco de dados, marque `user.enabled = false` ou simples `logout()`.

**P: Preciso fazer token exchange no backend?**
A: Sim! É essencial porque:
1. Nunca expor client_secret no frontend
2. Gerar JWT próprio da sua aplicação
3. Validar user no banco de dados
4. Sincronizar roles e permissões localmente

---

**🎉 Pronto!** Agora a autenticação Keycloak funciona com exchange no backend.
