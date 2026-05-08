# 🍔 FoodPilot — Modern Food Delivery Platform

A production-shaped, multi-vendor food delivery platform built end-to-end with **Next.js 14**, **Express + TypeScript**, **PostgreSQL + Prisma**, **Redis**, **WebSockets**, and an **AI services layer** for recommendations, conversational ordering, demand forecasting, courier dispatch, review intelligence and menu auto-tagging.

It is a complete, runnable monorepo demonstrating the architecture you'd ship at a Foodpanda / Uber Eats / DoorDash / Talabat-class company, with **mobile-first UX**, **role-based dashboards** for the four user groups, and **transparent fees + courier pay**.

> **Status:** all acceptance criteria from the spec are implemented and exercised end-to-end against a real Postgres database via the included seed data and demo flows.

---

## 1. Project overview

FoodPilot is a four-sided marketplace:

| Role | What they do | Example screens |
| --- | --- | --- |
| **Customer** | Browse, search, AI-assisted ordering, live tracking, reviews, loyalty | `/`, `/restaurants`, `/restaurants/:id`, `/cart`, `/checkout`, `/orders/:id`, `/assistant` |
| **Merchant** | Manage menu, accept orders, reply to reviews, track payouts | `/merchant`, `/merchant/orders`, `/merchant/menu`, `/merchant/reviews`, `/merchant/payouts`, `/merchant/settings` |
| **Courier** | Go online, accept offers, navigate, deliver, see transparent pay | `/courier`, `/courier/offers`, `/courier/earnings`, `/courier/transparency` |
| **Admin** | Approve restaurants/couriers, ops dashboard, demand analytics, support, audit | `/admin`, `/admin/orders`, `/admin/users`, `/admin/restaurants`, `/admin/couriers`, `/admin/coupons`, `/admin/analytics`, `/admin/support`, `/admin/audit` |

Highlights (modern food-delivery features included):

- **AI Meal Pilot** — conversational ordering that searches real menus and respects budget, dietary restrictions and allergies (no hallucinated dishes).
- **AI recommendations** — interpretable scoring across restaurants and dishes with explanations (`Highly rated`, `Within budget`, `Matches your favourite cuisine`, etc.).
- **Live order tracking** — WebSocket gateway pushes status changes and courier GPS pings to subscribed customer/order rooms.
- **Courier dispatch** — multi-objective ranker (distance, vehicle, rating, fairness rotation, workload) with explanations for *why* each offer was sent.
- **Transparent fees** — every fee is broken down on the cart and order screens; couriers see how each dollar of pay is computed.
- **Demand forecasting** — baseline 24-hour zone forecast with confidence; same interface a real ML model can plug into.
- **Review intelligence** — automatic sentiment, recurring-complaint detection, and AI-drafted merchant replies.
- **Menu intelligence** — auto-tagging of cuisine, allergens, dietary tags, and a "merchant must confirm" rule for HALAL/GLUTEN_FREE/allergen tags.
- **Sustainability** — eco-packaging badge, "no cutlery", bicycle-courier preference, and per-restaurant sustainability score.
- **Cloud / ghost kitchens** — multiple `virtualBrands` from one kitchen.
- **Loyalty + subscription** — points awarded per order, Plus/Pro plan with reduced fees.
- **Promo engine** — percent / fixed / free-delivery coupons with usage limits and per-restaurant scoping.

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Zustand · Framer Motion · lucide-react |
| Backend | Node.js · Express · TypeScript · ws (WebSocket) · helmet · CORS · rate-limit · compression · morgan |
| Database | PostgreSQL · Prisma ORM (schema-first) |
| Cache / realtime | Redis (with an in-memory fallback so the platform runs with zero infra) |
| AI | Provider-abstracted `getAIProvider()` — uses OpenAI when `OPENAI_API_KEY` is set, otherwise a deterministic mock |
| Auth | JWT access + refresh tokens, bcrypt password hashing, role-based middleware |
| Payments | Stripe-compatible webhook + payment-intent endpoint (mock provider when no key) |
| DevOps | Docker / docker-compose · GitHub Actions CI · npm workspaces · Prisma migrations |

---

## 3. Architecture

```
                                 ┌──────────────────────────┐
                                 │       Next.js 14         │
   browsers / mobile webviews ──▶│  customer · merchant ·   │
                                 │  courier · admin portals │
                                 └─────────┬────────────────┘
                                           │ REST + WS
                                           ▼
                                 ┌──────────────────────────┐
                                 │      Express API         │
                                 │  auth · cart · orders ·  │
                                 │  merchant · courier ·    │
                                 │  admin · ai · payments   │
                                 └────┬─────────┬───────────┘
                                      │         │
                          ┌───────────▼──┐  ┌───▼────────┐
                          │   Prisma /   │  │  Redis     │
                          │  PostgreSQL  │  │  (cache,   │
                          │              │  │  realtime) │
                          └──────────────┘  └────────────┘
                                      │
                          ┌───────────▼──────────────┐
                          │  AI services package     │
                          │  recommendation · meal   │
                          │  assistant · dispatch ·  │
                          │  forecast · review intel │
                          │  · menu tagger           │
                          └──────────────────────────┘
```

### Repository layout

```
food-delivery-app/
├─ apps/
│  ├─ api/                # Express + TS backend, WebSocket gateway, REST routes
│  └─ web/                # Next.js 14 monolithic app with all four portals
├─ packages/
│  ├─ database/           # Prisma schema, client, seed
│  ├─ shared/             # Zod schemas, geo helpers, pricing engine, types
│  └─ ai/                 # AI service classes + provider abstraction
├─ docker/                # Production Dockerfiles
├─ docker-compose.yml     # postgres + redis + api + web stack
├─ .github/workflows/     # CI pipeline
├─ .env.example
└─ package.json           # npm workspaces root
```

---

## 4. Database design

The Prisma schema (`packages/database/prisma/schema.prisma`) implements every entity from the spec with proper indexes, enums, soft constraints, and helpful denormalisations:

> User · RefreshToken · OtpCode · Address · Restaurant · MenuCategory · MenuItem · MenuItemVariant · AddOnGroup · AddOn · Cart · CartItem · Order · OrderItem · OrderEvent · Payment · Courier · CourierLocation · DeliveryAssignment · Review · Coupon · RestaurantPromotion · LoyaltyTransaction · Subscription · SupportTicket · SupportMessage · DemandZone · DemandForecast · RestaurantPayout · CourierPayout · Notification · AuditLog · PlatformConfig

Money columns use `Decimal(12,2)`. Geo columns are real `Float`s with composite indexes for nearby queries. Order status, payment status, courier status, etc. are all real Postgres enums.

---

## 5. API surface

REST endpoints (selected — see `apps/api/src/routes/`):

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/forgot-password
POST   /auth/verify-otp
GET    /auth/me

GET    /restaurants/nearby
GET    /restaurants/:id
GET    /restaurants/:id/menu
GET    /search?q=...

GET    /addresses
POST   /addresses

GET    /cart
POST   /cart/items
PATCH  /cart/items/:id
DELETE /cart/items/:id
POST   /cart/clear

POST   /orders
GET    /orders
GET    /orders/:id
POST   /orders/:id/cancel
POST   /orders/:id/review
POST   /orders/:id/dispatch

GET    /merchant/dashboard
PATCH  /merchant/restaurant
GET    /merchant/orders
PATCH  /merchant/orders/:id/status
GET|POST|PATCH|DELETE /merchant/menu-items
GET|POST|PATCH|DELETE /merchant/categories
GET    /merchant/reviews
POST   /merchant/reviews/:id/reply
GET    /merchant/payouts

GET    /courier/me
POST   /courier/status
PATCH  /courier/location
GET    /courier/offers
POST   /courier/offers/:id/accept
POST   /courier/offers/:id/reject
PATCH  /courier/orders/:id/pickup
PATCH  /courier/orders/:id/deliver
GET    /courier/earnings

GET    /admin/dashboard
GET|PATCH /admin/users
GET|PATCH /admin/restaurants
GET|PATCH /admin/couriers
GET|POST|PATCH /admin/coupons
GET|PATCH /admin/orders
GET    /admin/analytics/demand
GET|PATCH /admin/support-tickets
GET    /admin/audit-logs

POST   /ai/recommendations
POST   /ai/meal-assistant

GET|POST   /support/tickets
POST   /support/tickets/:id/messages

GET    /notifications
POST   /notifications/:id/read
POST   /notifications/read-all

POST   /payments/intents
POST   /payments/webhooks/stripe
```

WebSocket (at `ws://<api>/ws?token=<accessToken>`):

```
type=hello                     # on connect
type=subscribe,room=order:<id> # subscribe to a room

# server → client
type=order-status-updated
type=courier-location-updated
type=restaurant-order-received
type=courier-offer-created
type=support-message-created
```

---

## 6. AI modules

All AI services have stable interfaces so a real ML model or LLM can be slotted in without touching the routes:

- **RecommendationService** — interpretable scoring (preference + rating + speed + price-fit + popularity + availability), returns `score` + `reasons[]`.
- **MealAssistantService** — heuristic intent extraction + grounded suggestions from real menu data, optional LLM polish for the natural-language reply.
- **DispatchService** — multi-objective courier ranker with **fairness rotation** so high earners do not crowd the queue.
- **DemandForecastService** — baseline weekday/hour/zone forecaster with confidence; same interface a GNN or time-series model can replace later.
- **ReviewIntelligenceService** — sentiment + repeated-complaint detection + AI-drafted merchant replies.
- **MenuTaggingService** — auto-tags cuisine, allergens, spice level, and dietary; flags **`HALAL`, `VEGAN`, `GLUTEN_FREE`, allergen tags** as requiring merchant confirmation before publishing for legal/health safety.

The AI provider auto-detects: if `OPENAI_API_KEY` is set, real OpenAI is used; otherwise a deterministic mock keeps everything testable offline.

---

## 7. Setup

### Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL 14+ (or use docker-compose)
- (optional) Redis 6+
- (optional) Docker + docker-compose

### One-command local setup (with docker-compose)

```bash
cp .env.example .env
docker compose up --build
# wait until "🚀 Food API listening on ..."
# then open http://localhost:3000
```

### Manual setup (no Docker)

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env
# Edit DATABASE_URL if needed (default: postgresql://food:food@localhost:5432/food)

# 3. Generate Prisma client + migrate + seed
npm run db:generate
npm run db:push     # or: npm run db:migrate
npm run db:seed

# 4. Run both apps
npm run dev
# API:  http://localhost:4000
# Web:  http://localhost:3000
```

Other useful commands:

```bash
npm run typecheck       # all workspaces
npm run build           # production build
npm test                # vitest unit tests
npm run db:studio       # Prisma Studio at http://localhost:5555
```

---

## 8. Demo accounts

After running `npm run db:seed`:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@example.com` | `Customer@123` |
| Merchant | `merchant@example.com` | `Merchant@123` |
| Courier  | `courier@example.com`  | `Courier@123`  |
| Admin    | `admin@example.com`    | `Admin@12345`  |

The seed also creates 19 additional customers (`customer2@example.com`…), 9 additional merchants, 9 additional couriers, **10 restaurants** across Pakistani / Indian / Middle Eastern / Pizza / Burgers / Chinese / Healthy / Desserts / Coffee, **~25 menu items**, **5 coupons**, **5 demand zones with 24h forecasts each**, and **50 historical orders** (mostly delivered with reviews) so every dashboard has real data to render.

Try this end-to-end flow:

1. Login as `customer@example.com` → browse `/restaurants` → open a restaurant → add an item.
2. Visit `/checkout` → place the order with `WELCOME10` coupon.
3. Login (in another window) as `merchant@example.com` → `/merchant/orders` → **Accept** the order. Dispatch fires automatically.
4. Login as `courier@example.com` → `/courier/offers` → **Accept** the offer. Watch the customer's `/orders/:id` page update live via WebSocket.
5. Mark the order picked up and delivered from the courier app.
6. Login as `admin@example.com` → `/admin` for the platform KPIs and `/admin/analytics` for the demand heatmap.
7. Try `/assistant` and ask "Find me spicy halal food under $15" — the AI returns real menu items, with explanations, and you can add them to your cart in one click.

---

## 9. Environment variables

See `.env.example` for the full list. Key ones:

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis URL (optional — falls back to in-memory) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing keys |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | enable real Stripe |
| `OPENAI_API_KEY` | enable real LLM-backed assistant + review intelligence |
| `MAPBOX_TOKEN` / `GOOGLE_MAPS_API_KEY` | drop-in to enable real maps in `/orders/:id` |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` | web → API endpoints |

---

## 10. Deployment

A single docker-compose file ships the entire stack (`postgres`, `redis`, `api`, `web`). Production-friendly notes:

- **API** — deploy `apps/api` to Render, Fly.io, Railway, ECS, or any Node 20 host. Run `npm run db:migrate deploy` before boot.
- **Web** — `apps/web` deploys cleanly to **Vercel** or any Next.js host; set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to the API origin.
- **Postgres** — RDS / Neon / Supabase / Railway Postgres.
- **Redis** — Upstash / ElastiCache (optional but recommended for production).
- **Static assets** — drop in S3 / Cloudflare R2 by setting the `S3_*` env vars.
- **Webhooks** — point Stripe to `POST /payments/webhooks/stripe`.

CI is wired up at `.github/workflows/ci.yml` — runs typecheck, build and tests against a Postgres service container on every PR.

---

## 11. Testing

```bash
npm test                        # vitest unit tests (pricing, geo, etc.)
npm run typecheck               # tsc --noEmit across the monorepo
npm run build                   # production build (catches more issues)
```

You can manually exercise the full lifecycle with `curl` — every flow from `register → login → cart → order → merchant accept → dispatch → courier accept → deliver` works end-to-end against the seeded database.

---

## 12. Acceptance criteria

| ✓ | Criterion | Where |
| --- | --- | --- |
| ✅ | User can register and login | `POST /auth/register`, `POST /auth/login`, `/login`, `/register` |
| ✅ | Browse restaurants | `/restaurants`, `GET /restaurants/nearby` |
| ✅ | Add menu items to cart | `POST /cart/items`, `/restaurants/:id` |
| ✅ | Checkout → order created | `POST /orders`, `/checkout` |
| ✅ | Restaurant accept order | `PATCH /merchant/orders/:id/status`, `/merchant/orders` |
| ✅ | Courier accept delivery | `POST /courier/offers/:id/accept`, `/courier/offers` |
| ✅ | Customer track order status | `/orders/:id` + WebSocket |
| ✅ | Admin views all orders | `/admin/orders`, `GET /admin/orders` |
| ✅ | AI recommendation endpoint | `POST /ai/recommendations` |
| ✅ | AI meal assistant uses real menu | `POST /ai/meal-assistant`, `/assistant` |
| ✅ | RBAC prevents wrong dashboard access | `requireRole(...)` middleware + `<AuthGuard role="…">` |
| ✅ | Prisma migrations run | `npm run db:push` / `db:migrate` |
| ✅ | Seed loads | `npm run db:seed` |
| ✅ | README explains setup | this file |

---

## 13. Known limitations / future enhancements

- **Maps** — the order-tracking screen renders an ETA + courier coords; bring-your-own-map by setting `NEXT_PUBLIC_MAPBOX_TOKEN` and replacing the placeholder pane.
- **Push / SMS notifications** — wired to abstractions (`PUSH_PROVIDER`, `SMS_PROVIDER`) but currently no-op so the platform runs without external services.
- **Stripe** — the payment-intents endpoint returns a mock `clientSecret` until `STRIPE_SECRET_KEY` is configured; webhook signature verification activates when `STRIPE_WEBHOOK_SECRET` is set.
- **OAuth (Google/Apple)** — placeholder; provider wiring lives in `apps/api/src/routes/auth.ts` and is the natural extension point.
- **Demand forecasting** — baseline only; the `DemandForecastService` interface is intentionally compatible with a future ML model (GNN, Prophet, etc.).
- **Group ordering / scheduled orders** — schema (`Order.isGroupOrder`, `groupOrderToken`, `scheduledFor`) and ordering logic exist; UI is currently a checkout option only.
- **Multi-language i18n** — Tailwind text is RTL-friendly and `next.config.js` supports adding locales without touching the data layer.

---

## 14. License

MIT — see `LICENSE` (or treat this as demo / educational code).
