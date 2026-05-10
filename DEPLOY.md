# 🚀 Deploying FoodPilot

FoodPilot is a typical 3-tier stack: **Next.js web → Express API → Postgres + Redis**. There are deployment recipes for the most popular free tiers below — pick whichever you prefer.

> ⚠️ **All the providers below require an account/login.** Cloud Agents in Cursor cannot deploy on your behalf without credentials. Add a `VERCEL_TOKEN`, `RENDER_API_KEY`, `FLY_API_TOKEN`, or `RAILWAY_TOKEN` to **Cursor → Cloud Agents → Secrets** and re-run an agent if you want it to deploy for you. Until then, follow these recipes manually.

---

## Option A — Vercel + Render (recommended)

**Why:** Vercel is free for Next.js, Render has a free Postgres + a free Node service.

### 1. Deploy Postgres + API to Render

```bash
# Fork / push this repo to GitHub, then in Render:
#   New → Blueprint → point at this repo.
# Render will read render.yaml and provision:
#   - food-db        (free Postgres)
#   - food-api       (Express on port 10000)
#   - food-web       (Next.js)
```

After deploy:
- Note the public URL of `food-api`, e.g. `https://food-api.onrender.com`
- In `food-web` settings, set:
  - `NEXT_PUBLIC_API_URL = https://food-api.onrender.com`
  - `NEXT_PUBLIC_WS_URL  = wss://food-api.onrender.com`
- In `food-api` settings, set `CORS_ORIGIN` to the web URL.
- Render auto-runs `db:push` + `db:seed` from the build command, so the demo accounts work immediately.

### 2. Or, web on Vercel (better cold starts)

```bash
# In Vercel:
#   New Project → Import this repo
#   Root Directory: apps/web
#   Framework: Next.js (auto-detected)
#   Env vars:
#     NEXT_PUBLIC_API_URL = https://your-api-host
#     NEXT_PUBLIC_WS_URL  = wss://your-api-host
```

`apps/web/vercel.json` already configures the build command to install workspace deps and generate the Prisma client.

---

## Option B — Fly.io + Neon (for performance)

**Why:** Fly.io free tier gives you a real always-on VM in many regions; Neon gives 0.5 GB Postgres free.

```bash
# 1. Create a Neon database, copy its DATABASE_URL.
# 2. Install flyctl, then:
flyctl launch --copy-config --no-deploy
flyctl secrets set DATABASE_URL="postgresql://...neon..." \
                  JWT_ACCESS_SECRET=$(openssl rand -hex 32) \
                  JWT_REFRESH_SECRET=$(openssl rand -hex 32) \
                  CORS_ORIGIN="https://<your-web>.vercel.app"
flyctl deploy
flyctl ssh console -C "node packages/database/dist/seed.js"
```

Web app: deploy to Vercel as in Option A.

---

## Option C — Railway (one-click full stack)

Railway hosts Postgres + Node + Next.js together.

```bash
# 1. Push to GitHub.
# 2. railway init → choose "Deploy from GitHub repo".
# 3. Railway will pick up railway.json and Nixpacks.
# 4. Add a Postgres plugin, copy DATABASE_URL.
# 5. Set env vars (same list as Option A).
# 6. railway run "npm run db:push && npm run db:seed"
```

---

## Option D — Docker Compose anywhere (VPS, dev, CI)

```bash
cp .env.example .env
docker compose up --build
# → web on :3000, api on :4000, postgres on :5432, redis on :6379
```

This is the only fully self-contained option — works on any VPS (Hetzner, OVH, DigitalOcean, Hostinger) for a few dollars/month.

---

## Static marketing page only (no backend)

If you want a public preview of just the landing page (no orders, no AI agents), the lightest free path is **surge.sh** — it supports anonymous deploys:

```bash
cd apps/web
NEXT_PUBLIC_API_URL=https://your-future-api.example.com next build
# Note: full Next.js needs a Node host. For a true static export
# of the marketing page only, use `apps/web/public/landing-static.html`
# (a self-contained copy of the hero produced by the deploy script).

npm i -g surge
surge ./public your-subdomain.surge.sh
```

The included `apps/web/public/landing-static.html` is a self-contained, dependency-free HTML/CSS preview that mirrors the design and can be hosted on **GitHub Pages, surge.sh, Cloudflare Pages, Netlify Drop, or Vercel** without any backend.

---

## Environment variables checklist

| Var | API | Web | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | – | Postgres URL |
| `REDIS_URL` | optional | – | Falls back to in-memory |
| `JWT_ACCESS_SECRET` | ✅ | – | rotate regularly |
| `JWT_REFRESH_SECRET` | ✅ | – | rotate regularly |
| `CORS_ORIGIN` | ✅ | – | comma-separated; e.g. `https://foodpilot.vercel.app` |
| `OPENAI_API_KEY` | optional | – | enables real LLM-backed agents |
| `STRIPE_SECRET_KEY` | optional | – | enables real card payments |
| `MAPBOX_TOKEN` | optional | `NEXT_PUBLIC_MAPBOX_TOKEN` | enables real map on tracking page |
| `NEXT_PUBLIC_API_URL` | – | ✅ | API base URL |
| `NEXT_PUBLIC_WS_URL` | – | ✅ | WebSocket URL (use `wss://` in prod) |

---

## After deploy: verify it works

```bash
# 1. Health
curl https://your-api.example.com/health

# 2. Login as the seeded demo customer
curl -X POST https://your-api.example.com/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@example.com","password":"Customer@123"}'

# 3. List agents
curl https://your-api.example.com/ai/agents -H "Authorization: Bearer <token>"
```

You should see 12 registered AI agents and the four demo dashboards live at the web URL.
