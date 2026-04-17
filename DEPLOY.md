# DEPLOY.md — Master Build Codex

This app uses Express on port 5000 with a SQLite database. For production deployment, use a platform that supports persistent Node.js servers (Railway, Render, Fly.io, etc.) — Vercel serverless functions do not persist file-system state needed for SQLite.

## Option A — Railway (Recommended)

1. Push code to a GitHub repository
2. Create a new Railway project → "Deploy from GitHub"
3. Set environment variables in Railway dashboard:
   - `PERPLEXITY_API_KEY` = your Perplexity API key
   - `NODE_ENV` = `production`
4. Railway auto-detects `npm start` from `package.json`
5. SQLite `dev.db` is created automatically on first startup

## Option B — Render

1. Create a new "Web Service" on Render
2. Connect your GitHub repository
3. Set:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Environment variables: `PERPLEXITY_API_KEY`, `NODE_ENV=production`
4. Add a persistent disk at `/app` mount point so `dev.db` survives deploys

## Option C — Fly.io

```bash
fly launch
fly secrets set PERPLEXITY_API_KEY=pplx-xxxx...
fly volumes create data --size 1
# Add volume mount in fly.toml: [mounts] destination = "/data"
# Set DB path via env: DB_PATH=/data/dev.db
fly deploy
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PERPLEXITY_API_KEY` | Yes | Perplexity API key from perplexity.ai/api |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | No | Defaults to 5000 |

---

## Build for Production

```bash
npm run build       # Compiles server (dist/index.cjs) + frontend (dist/public/)
npm start           # Starts production server
```

---

## Switching to Postgres (Optional)

If you want a proper hosted database instead of SQLite:

1. Install: `npm install pg @types/pg drizzle-orm/pg-core`
2. Update `server/db.ts` to use `drizzle-orm/node-postgres`
3. Update `shared/schema.ts` to use `pgTable` instead of `sqliteTable`
4. Set `DATABASE_URL` env var to your Postgres connection string
5. Run `drizzle-kit push` to create tables

---

## Preview Deployments on Git Push (GitHub Actions example)

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      # Add your deployment step here (Railway CLI, Fly deploy, etc.)
```
