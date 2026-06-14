# Migracao para backend proprio

Esta branch cria o inicio da migracao do Veloxy para um backend proprio, preservando a versao Firebase da `app-beta-1.3`.

## Estrategia

1. Manter Firebase Auth funcionando enquanto o banco proprio nasce.
2. Criar a API propria em `server/`.
3. Comecar por corridas, porque elas alimentam inicio, feed, stats e perfil.
4. Trocar as telas aos poucos para `src/services/api`.
5. Migrar perfil, social, grupos, eventos e leaderboard.
6. Deixar autenticacao propria por ultimo.

## Primeira entrega

- Backend Fastify separado.
- SQLite local usando o modulo nativo do Node.
- Modelos iniciais de `User` e `Run`.
- Rotas:
  - `GET /health`
  - `POST /runs`
  - `GET /users/:userId/runs`
  - `DELETE /runs/:runId?userId=...`
  - `GET /users/:userId/stats`
- Cliente inicial no front em `src/services/api`.

## Proximo passo

Instalar dependencias do backend e rodar a primeira migracao local:

```powershell
cd server
npm install
copy .env.example .env
npm run dev
```

Depois disso, ligamos a tela de corrida para salvar tambem na API propria, em modo paralelo com Firebase.

## Ativar salvamento paralelo no front

Crie ou edite o `.env.local` na raiz do projeto:

```env
VITE_USE_OWN_API=true
VITE_API_URL=http://localhost:3333
```

Com isso, a corrida continua salvando no Firebase e tambem tenta salvar na API propria. Se a API local estiver desligada, o Firebase continua funcionando.

As telas de Inicio e Stats tambem passam a ler da API propria quando `VITE_USE_OWN_API=true`. Se a API cair, elas voltam automaticamente para o Firebase.
