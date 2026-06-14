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

## Primeira fase

- Manter Firebase Auth no app.
- Migrar primeiro corridas e estatisticas.
- Depois perfil, social, grupos, eventos e leaderboard.
- Auth propria fica para a ultima etapa.

## Banco

Nesta fase usamos SQLite nativo do Node em `server/data/veloxy.db`. Isso evita depender de servicos externos enquanto a migracao ainda esta nascendo. Quando a API estabilizar, podemos trocar para PostgreSQL mantendo as mesmas rotas.
