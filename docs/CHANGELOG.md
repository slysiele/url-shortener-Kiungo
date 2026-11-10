# Changelog

Add a short entry here with every change, newest at the top.

## 0.1.0 (2026-11-09): MVP

**Backend**
- Spring Boot 3.5 / Java 21 project with Flyway schema (`V1__init.sql`) for PostgreSQL and H2
- Accounts with JWT, 14-day Pro trial, profile and theme, password change
- Links CRUD with custom slugs, tags, expiry, click limits, pause/resume, iOS/Android targeting
- Redirect endpoint with async click recording, query pass-through, bot detection, hashed IPs, CDN geo headers
- Stats endpoint (period comparison, daily series, top-N breakdowns) and click stream
- QR code PNGs, CSV import (Bitly-compatible) and export, bulk create
- API keys (hashed, revocable) and per-plan rate limiting
- Plans (Free, Starter, Pro, Business) with limits enforced server-side; mock checkout
- OpenAPI docs at `/swagger-ui.html`
- Demo data seeder for local dev; end-to-end integration tests

**Frontend**
- Angular 20 app: landing page with pricing, sign in/up, dashboard shell with a quick-shorten bar
- Links table with search, editor (UTM builder, expiry, targeting), QR dialog
- Statistics with SVG area chart and breakdowns; per-link stats; live click stream
- Import & export, Integrations & API (keys plus code samples), Plan & billing, Settings
- Themes: Jacaranda, Night, Savanna, Ocean; responsive down to phone width

**Ops**
- Dockerfiles, local `docker-compose.yml`, production compose with Caddy, GitHub Actions CI
