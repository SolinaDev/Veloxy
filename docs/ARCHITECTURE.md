# Arquitetura

O Veloxy e um aplicativo React/Vite com Firebase Authentication para login e um backend
proprio (FastAPI + PostgreSQL, em `backend/`) que esta assumindo aos poucos os dados e
regras de negocio que antes viviam so no Firestore/Storage. Ver "Backend e migracao"
abaixo e `backend/README.md` para detalhes.

## Organizacao

```text
src/
  assets/       Imagens e arquivos estaticos usados pela interface
  components/   Componentes compartilhados da aplicacao
  components/ui Componentes base do design system
  config/       Inicializacao de SDKs e configuracoes externas
  hooks/        Contextos e hooks React reutilizaveis
  lib/          Funcoes utilitarias e regras de dominio
  pages/        Telas agrupadas por area da aplicacao
  services/     Integracao com Firebase e operacoes de dados
  test/         Setup e testes automatizados
  types/        Tipos TypeScript compartilhados
```

## Fluxo principal

1. `src/main.tsx` inicia a aplicacao.
2. `src/App.tsx` registra provedores globais e rotas.
3. `src/config/firebase.ts` centraliza as instancias do Firebase (usado hoje so para Auth).
4. `src/services/*` concentra leitura e escrita de dados, um arquivo por dominio
   (`usersApi.ts`, `activitiesApi.ts`, `groupsApi.ts`, `eventsApi.ts`, `petApi.ts`,
   `productsApi.ts`). Cada um mistura chamadas ao backend proprio (via `apiClient.ts`)
   com leitura/escrita direta no Firestore — ver "Backend e migracao" abaixo.
5. `src/pages/*` monta as experiencias de login, feed, corrida, grupos, eventos, desafios e perfil. (A loja/marketplace ainda nao existe — ver Roadmap no README.)

## Backend e migracao

`backend/` e uma API propria (FastAPI + PostgreSQL + Alembic) que esta substituindo o
Firestore/Storage gradualmente. O login continua 100% no Firebase Auth: o backend so
valida o ID token recebido (`backend/app/auth.py`), nao emite nem gerencia sessao.

A migracao NAO segue fronteira limpa por dominio — dentro do mesmo arquivo de servico,
algumas funcoes ja chamam o backend e outras ainda usam Firestore direto. Padrao observado:

- Mutacoes (criar/atualizar/entrar/sair/curtir etc.) tendem a ja estar no backend,
  via `api.get/post/put/delete` de `src/services/apiClient.ts`.
- Leituras em tempo real (`onSnapshot`, feeds, mensagens, comentarios) ainda usam
  Firestore direto — o backend so tem realtime para grupos, via WebSocket
  (`src/services/groupSocket.ts` <-> `backend/app/ws_manager.py`), nao um substituto
  geral do `onSnapshot`.
- `productsApi.ts` (catalogo, somente leitura) e `petApi.ts` ja sao 100% backend.

Isso muda com frequencia — para saber o estado exato de um dominio, olhe o arquivo
`src/services/*Api.ts` correspondente em vez de confiar numa lista fixa aqui ou no
comentario do `.env.example` (nenhum dos dois e a fonte da verdade, so uma pista).

O backend tambem expoe rotas para dominios que o frontend ainda nao teria motivo pra
usar (`backend/app/main.py`) — antes de mexer numa rota "sem uso aparente", confirme
com quem escreveu se e trabalho em andamento ou codigo esquecido.

Setup e mais detalhes: `backend/README.md`.

## Convencoes

- Use o alias `@/` para imports dentro de `src`.
- Crie integracoes externas em `src/services`.
- Crie regras puras de negocio em `src/lib`.
- Mantenha componentes reutilizaveis em `src/components`.
- Mantenha componentes especificos de uma tela perto da propria tela quando o volume crescer.
