# Veloxy

Aplicativo gamificado de corrida que combina tracking de atividades, comunidade, eventos e recompensas ligadas ao desempenho do corredor.

## Visao Geral

O Veloxy foi criado para transformar treinos em uma experiencia mais social e orientada por dados. A aplicacao permite registrar corridas, acompanhar estatisticas, evoluir em niveis, participar de desafios e acessar beneficios dentro de uma loja integrada.

## Funcionalidades

- Autenticacao com e-mail/senha e login com Google
- Feed de atividades da comunidade
- Registro de corrida com GPS real (foreground e background no Android), distancia, tempo, ritmo e calorias
- Dashboard com resumo de desempenho
- Sistema de XP, niveis e ranking
- Grupos de corrida com km semanal por grupo
- Eventos de corrida por localidade
- Perfil do usuario com foto e estatisticas

> Marketplace/loja com descontos ainda nao esta implementado (ver Roadmap).

## Stack

- React 18
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- React Router
- TanStack Query
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Vitest

## Estrutura

```text
src/
  assets/       Imagens e arquivos estaticos
  components/   Componentes reutilizaveis
  config/       Configuracoes externas, como Firebase
  hooks/        Contextos e hooks React
  lib/          Utilitarios e regras de negocio
  pages/        Telas da aplicacao
  services/     Operacoes de autenticacao, banco e storage
  test/         Setup e testes
  types/        Tipos compartilhados
```

Mais detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Como Rodar

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` com base no `.env.example`.

3. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

4. Acesse o endereco exibido no terminal.

## Scripts

```bash
npm run dev          # inicia o app localmente
npm run build        # gera build de producao
npm run preview      # previsualiza o build
npm run lint         # executa analise de codigo
npm run test         # executa testes
npm run test:watch   # executa testes em modo observacao
```

## Variaveis de Ambiente

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

## Roadmap

- [x] Autenticacao (e-mail/senha e Google)
- [x] Estrutura base do app
- [x] Feed e dashboard inicial
- [x] Gamificacao base
- [x] Tracking real com GPS (foreground e background no Android)
- [x] Grupos com km semanal calculado a partir das corridas dos membros
- [ ] Cloud Function para validar XP no servidor (hoje o calculo e so no cliente)
- [ ] Engine completa de descontos
- [ ] Marketplace funcional com checkout
- [ ] Historico avancado de atividades

## Equipe

- Cauã Morais Lima
- Joao Vitor da Silva Santos
- Marcelo Henrique Martins de Andrade
- Raphael Henrique Paiva Solina

## Orientadores

- Renato de Mattos Onofre
- Douglas de Cassio Quinzani Gaspar
