# Arquitetura

O Runnex e um aplicativo React/Vite com Firebase Authentication para login e um
backend proprio (FastAPI + PostgreSQL, em `backend/`) para usuarios, atividades,
grupos, eventos e pet. Cloud Firestore hoje e usado so para dados legados e para
os grupos/eventos de demonstracao (fallback). Veja `backend/README.md` para a
arquitetura do backend.

## Organizacao

```text
src/
  assets/       Imagens e arquivos estaticos usados pela interface
  components/   Componentes compartilhados da aplicacao
  components/ui Componentes base do design system
  config/       Inicializacao de SDKs e configuracoes externas
  content/      Conteudo estatico (termos de uso, politica de privacidade)
  hooks/        Contextos e hooks React reutilizaveis
  lib/          Funcoes utilitarias e regras de dominio
  pages/        Telas agrupadas por area da aplicacao
  services/     Acesso a dados, um arquivo por dominio (usersApi, activitiesApi,
                groupsApi, eventsApi, petApi, productsApi) + apiClient e
                groupSocket. database.ts e' um barrel que reexporta os demais,
                mantido so por compatibilidade de import.
  test/         Setup e testes automatizados
  types/        Tipos TypeScript compartilhados
```

## Fluxo principal

1. `src/main.tsx` inicia a aplicacao.
2. `src/App.tsx` registra provedores globais e rotas.
3. `src/config/firebase.ts` centraliza as instancias do Firebase (Auth + Firestore legado).
4. `src/services/*Api.ts` concentra leitura e escrita de dados, falando com o
   backend proprio (`VITE_API_URL`) e, pontualmente, com o Firestore legado.
5. `src/pages/*` monta as experiencias de login, feed, corrida, grupos, eventos,
   pet e perfil. (A loja/marketplace ainda nao existe — ver Roadmap no README.)

## Convencoes

- Use o alias `@/` para imports dentro de `src`.
- Crie integracoes externas em `src/services`.
- Crie regras puras de negocio em `src/lib`.
- Mantenha componentes reutilizaveis em `src/components`.
- Mantenha componentes especificos de uma tela perto da propria tela quando o volume crescer.
