# NetNotify — Frontend

Frontend React + TypeScript para gerenciamento de mensagens/alertas do NetNotify. Fornece UI responsiva para criar, editar, clonar, listar e filtrar mensagens com editor rich-text (TinyMCE) e controles de tema/sidebars.

## Propósito
Aplicação de administração para criar e gerenciar mensagens/alertas que serão distribuídas pelo backend:
- Criar/editar mensagens ricas (texto + imagens referenciadas).
- Listar, filtrar e paginar mensagens.
- Ações rápidas: visualizar, clonar, apagar.
- Suporte a permissões (ex.: usuário admin vê ações extras).

## Funcionalidades principais
- Editor WYSIWYG baseado em TinyMCE:
  - Inserção de imagens por URL (modal com opção de upload se configurado).
  - Edição direta do HTML foi removida para evitar conflitos de sincronização.
  - Proteções para preservar caret/seleção durante sincronização controlada.
- Listagem e filtros:
  - Filtros por título, conteúdo, nível e tipo.
  - Filtros sincronizados com a URL (permite links com filtros aplicados).
  - Formulário de filtros responsivo e otimizado para mobile.
- Sidebar, header e controles de tema:
  - Toggle de tema (light/dark) com tokens CSS.
  - Trigger do menu posicionado no header para evitar sobreposição.
- Componentes reutilizáveis:
  - Dialog/modal, Button, StyledSelect, tabela, botões de ação com ícones.
- Integração com API:
  - Hooks customizados que usam axios.
  - Cache e fetching com TanStack Query (react-query).
- Acessibilidade e UX:
  - Focus rings, estados de hover, responsividade mobile-first.

## Arquitetura (visão geral)
- src/pages — páginas principais (MessagesList, HomePage, ...).
- src/components — componentes reutilizáveis:
  - /ui — primitives (Button, Dialog, SidebarProvider, etc.).
  - editor — wrapper do TinyMCE.
  - header.tsx, app-sidebar.tsx, mode-toggle.tsx.
- src/layouts — layouts da aplicação (MainPageLayout).
- src/hooks — hooks customizados (ex.: useMessagesApi, auth).
- src/index.css — tokens de tema (CSS custom properties).
- Integração com React Router para rotas/URL params.

## Tech stack (principais)
- React + TypeScript
- Vite (dev/build)
- TinyMCE — editor rich-text
- TanStack Query — fetching/caching
- axios — client HTTP
- react-hook-form + zod — formulários e validação (tipagem e esquema)
- Tailwind CSS (utilitários) + CSS custom properties para tokens de tema
- shadcn/ui (componentes primitives) — padrões de UI reutilizáveis
- lucide-react — ícones
- react-router-dom — roteamento

## Desenvolvimento local
1. Instalar dependências:
   npm install
2. Rodar em desenvolvimento:
   npm run dev
3. Build de produção:
   npm run build
   npm run preview

## Observações e recomendações
- O editor usa TinyMCE e foi adaptado para evitar reescritas concorrentes que causam perda de caret; se o app fizer autosave/atualizações externas, prefira debouncing ou pausar atualizações enquanto o usuário edita.
- Sanitização: mensagens contêm HTML — sanitizar no backend antes de exibir em contextos não confiáveis.
- Tokens de tema centralizados em `src/index.css` — ajustar lá para alterar paletas light/dark.
- Melhorias sugeridas: modal de imagem com preview + progresso de upload, centralizar estilos de botão no componente Button para consistência, testes E2E cobrindo fluxo de edição/inserção de imagem.
