# Veloxy API

Backend proprio do Veloxy. Nesta primeira fase ele nasce separado do app atual para permitir migrar do Firebase sem quebrar a versao `app-beta-1.3`.

## Rodar localmente

```powershell
cd server
npm install
copy .env.example .env
npm run dev
```

A API sobe em `http://localhost:3333`.

## Seguranca

Por padrao, `REQUIRE_AUTH=false` facilita os testes locais. Quando quiser proteger a API, defina:

```env
REQUIRE_AUTH=true
GOOGLE_APPLICATION_CREDENTIALS="C:/caminho/para/service-account.json"
```

Com isso, o backend valida o token do Firebase Auth enviado pelo app e impede acessar dados de outro usuario.

## Primeira fase

- Manter Firebase Auth no app.
- Migrar primeiro corridas e estatisticas.
- Depois perfil, social, grupos, eventos e leaderboard.
- Auth propria fica para a ultima etapa.

## Banco

Nesta fase usamos SQLite nativo do Node em `server/data/veloxy.db`. Isso evita depender de servicos externos enquanto a migracao ainda esta nascendo. Quando a API estabilizar, podemos trocar para PostgreSQL mantendo as mesmas rotas.

O PostgreSQL ja esta definido como destino da migracao. O schema inicial fica em:

```text
server/sql/001_init_postgres.sql
```

Quando o Postgres local estiver pronto, crie o banco `veloxy` e rode esse SQL. Depois usamos `DATABASE_URL` para trocar a API para PostgreSQL.
