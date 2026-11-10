# Kiungo: URL shortener with analytics, API and subscriptions

*Kiungo* is Swahili for "link". This is a full SaaS URL shortener, built for SMS, WhatsApp and social campaigns.

| | |
|---|---|
| **Backend** | Java 21, Spring Boot 3.5, Spring Security (JWT + API keys), JPA, Flyway, PostgreSQL (H2 for local dev) |
| **Frontend** | Angular 20 (standalone components, signals), hand-built SVG charts, 4 themes |
| **API docs** | OpenAPI / Swagger UI at `/swagger-ui.html` |
| **Deploy** | Docker, Docker Compose, Caddy (automatic HTTPS), GitHub Actions CI |

## What works now (v0.1)

- Sign up and sign in, with a **14-day Pro trial** for every new account. The account then drops to Free unless the user subscribes.
- Shorten links with random or custom slugs, titles, tags, a **UTM builder**, **expiry dates**, **click limits**, and **iOS/Android targeting** to send phones to the right app store.
- Fast redirects at `/{slug}`. Query strings pass through to the destination, and clicks are recorded asynchronously.
- Analytics:
  - totals compared with the previous period
  - human vs bot clicks (WhatsApp and Facebook link previews are detected)
  - unique visitors
  - a daily chart
  - top links, countries, cities, referrers, browsers, OS, devices and UTM sources/campaigns
- A **live click stream**.
- **QR codes** in custom colours, downloadable as PNG at up to 2048 px.
- **CSV import** (Bitly-compatible columns) and **CSV export**.
- **API keys** (hashed, shown once, revocable) with **per-plan rate limits**, plus code samples in cURL, Node, Python and Java.
- **Plans**: Free, Starter, Pro and Business, with limits enforced in the backend. Billing runs in mock mode until Paystack is connected (Phase 3).
- **Themes**: Jacaranda (light), Night, Savanna and Ocean. The choice is saved to the account.

## Run it locally

You need **Java 21**, **Node 20+** and nothing else. Local dev uses a file-based H2 database, so there's no database to install.

### 1. Backend (IntelliJ or terminal)

```bash
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

In IntelliJ, choose *File → Open → backend/pom.xml*, then run `KiungoApplication`.

- API: http://localhost:8080 · Swagger: http://localhost:8080/swagger-ui.html · DB console: http://localhost:8080/h2-console (JDBC URL `jdbc:h2:file:./data/kiungo`, user `sa`)
- The first run creates a **demo account with realistic data**: `demo@kiungo.dev` / `demo1234`

### 2. Frontend (VS Code or terminal)

```bash
cd frontend
npm install
npm start                      # http://localhost:4200, proxies /api to :8080
```

### Or run everything in Docker (uses PostgreSQL)

```bash
docker compose up --build      # app on :4200, API and short links on :8080
```

## Tests

```bash
cd backend && ./mvnw test      # end-to-end flow: sign up → shorten → redirect → stats → API keys → plan limits
cd frontend && npx ng build    # type-checks templates and builds the production bundle
```

## Project layout

```
backend/               Spring Boot app
  src/main/java/com/kiungo/
    auth/              sign-up, login, JWT + API-key filters
    link/              links CRUD, slugs, CSV, QR codes
    redirect/          GET /{slug}, the hot path
    analytics/         click recording, UA parsing, stats queries
    apikey/            API key management
    billing/           plans + checkout (mock → Paystack in Phase 3)
    user/              User entity and Plan limits
    common/            errors, rate limiting
  src/main/resources/db/migration/   Flyway SQL migrations
frontend/              Angular app
  src/app/core/        API client, auth, theme, models
  src/app/shared/      charts, icons, pricing table, toasts
  src/app/pages/       landing, sign in/up, "link unavailable"
  src/app/dashboard/   the signed-in app (links, stats, clicks, import, API, billing, settings)
deploy/                production docker-compose + Caddyfile
docs/                  plan, architecture, API, deployment, dev setup, changelog
```

## Documentation

- [docs/PLAN.md](docs/PLAN.md): roadmap, commercialisation and pricing, ideas backlog
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how it fits together, data model, scaling path
- [docs/API.md](docs/API.md): integrating with the public API
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): going live on your own domain
- [docs/DEV_SETUP.md](docs/DEV_SETUP.md): IntelliJ, VS Code with Claude Code, and the GitHub repo
- [docs/CHANGELOG.md](docs/CHANGELOG.md): what changed in each version
