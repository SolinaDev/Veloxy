# Arquitetura

O Runnex e um aplicativo React/Vite com Firebase para autenticacao, banco de dados e armazenamento de arquivos.

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
3. `src/config/firebase.ts` centraliza as instancias do Firebase.
4. `src/services/*` concentra leitura e escrita de dados.
5. `src/pages/*` monta as experiencias de login, feed, corrida, grupos, eventos, desafios e perfil. (A loja/marketplace ainda nao existe — ver Roadmap no README.)

## Convencoes

- Use o alias `@/` para imports dentro de `src`.
- Crie integracoes externas em `src/services`.
- Crie regras puras de negocio em `src/lib`.
- Mantenha componentes reutilizaveis em `src/components`.
- Mantenha componentes especificos de uma tela perto da propria tela quando o volume crescer.
