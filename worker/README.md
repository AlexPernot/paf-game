# paf-game-backend

Cloudflare Worker that receives the upload form submission (player name + Letterboxd zip export
pairs), computes the movies common to all players, enriches them with TMDB data, sorts by
popularity, and stores the resulting `game.csv` in a Cloudflare R2 bucket.

## Develop

```bash
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

After deploying, set the Worker's `*.workers.dev` URL (or custom route) as `BACKEND_URL` for the
frontend (see the root `Caddyfile` / `.github/workflows/deploy-pages.yml`).
