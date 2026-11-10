# Product plan

## Vision

The link shortener East African businesses reach for first. Links are short enough for a 160-character SMS, the
numbers are honest (WhatsApp previews aren't counted as people), you can pay with M-Pesa, and an API lets SMS
platforms, CRMs and shops create tracked links automatically.

**Who it's for**
1. SMEs and marketers running SMS, WhatsApp and social campaigns.
2. Developers and platforms (SMS gateways, e-commerce, fintech) who need links via API.
3. Agencies managing links for several clients (Teams, Phase 4).

**How it's different from Short.io and Bitly:** local payments (M-Pesa) and KES pricing, bot-aware analytics as
the default view, SMS-first defaults, a generous trial, and a simple API with copy-paste examples.

## Roadmap

### Phase 1: MVP ✅ (v0.1, this release)
- [x] Accounts, JWT auth, 14-day Pro trial
- [x] Links: random/custom slug, title, tags, UTM builder, expiry, click limit, pause/resume
- [x] iOS/Android device targeting
- [x] Redirect with async click recording, query pass-through, bot detection, hashed IPs
- [x] Analytics dashboard, click stream, per-link stats
- [x] QR codes, CSV import and export, bulk create endpoint
- [x] API keys, per-plan rate limits, Swagger docs
- [x] Plans and limits (mock billing)
- [x] 4 themes, mobile-friendly layout
- [x] Docker, CI, docs

### Phase 2: Go live (next)
- [ ] Buy domains: one for the app (e.g. `kiungo.app`) and a **short** one for links (e.g. `kiun.go`, `kgo.to`, `kiu.ng`)
- [ ] Deploy to a VPS with Docker Compose and Caddy, behind Cloudflare (gives country/city data). See DEPLOYMENT.md.
- [ ] Transactional email (Resend, Postmark or Amazon SES): verify email, password reset, trial-ending reminders
- [ ] Error tracking (Sentry) and uptime monitoring (Better Stack or UptimeRobot)
- [ ] Terms of service, privacy policy (Kenya Data Protection Act 2019), acceptable-use policy
- [ ] **Abuse protection**: check destinations against Google Safe Browsing, block phishing and malware, add a report-abuse page. Shorteners get abused fast.
- [ ] Daily Postgres backups to object storage

### Phase 3: Get paid
- [ ] Paystack subscriptions. See "Payments" below.
- [ ] KES prices beside USD
- [ ] Invoices and receipts by email, billing history page
- [ ] Dunning: retry failed card charges, send M-Pesa renewal reminders with a pay link, grace period before downgrading
- [ ] Annual plans (2 months free)

### Phase 4: Grow
- [ ] **Custom domains**: users bring `go.theirbrand.com`. Caddy's on-demand TLS issues certificates automatically.
- [ ] **Teams and workspaces** with roles (owner, editor, viewer), for agencies
- [ ] **Link-in-bio pages** (a Linktree alternative) on the same domain
- [ ] Webhooks ("link clicked", "link created") and official SDKs (Node, Python, PHP)
- [ ] Zapier/Make integration, WordPress plugin, browser extension
- [ ] Bulk create from Google Sheets (like the Short.io screenshot)
- [ ] Conversion tracking: a JS snippet or server postback that ties purchases to clicks
- [ ] A/B rotation: one link that splits traffic across destinations
- [ ] Geo-targeting: send Kenya to `.co.ke`, everyone else to `.com`
- [ ] Password-protected links, link cloaking, `robots` policy per domain
- [ ] Scheduled reports by email or WhatsApp
- [ ] Africa's Talking integration: send an SMS blast and its tracked links in one step
- [ ] AI: suggest slugs, summarise "why did clicks spike on Tuesday?"

## Commercialisation

### Plans (in `backend/.../user/Plan.java`; the frontend reads them from `/api/v1/billing/plans`)

| | Free | Starter | Pro | Business |
|---|---|---|---|---|
| Price / month | $0 | **$5** (~KES 650) | **$15** (~KES 1,950) | **$49** (~KES 6,350) |
| New links / month | 50 | 1,000 | 10,000 | Unlimited |
| Analytics history | 30 days | 90 days | 1 year | Unlimited |
| QR codes, click stream | ✓ | ✓ | ✓ | ✓ |
| CSV import, bulk API | – | ✓ | ✓ | ✓ |
| API | – | 60 req/min | 300 req/min | 1,000 req/min |
| iOS/Android targeting | – | – | ✓ | ✓ |
| Custom domains (Phase 4) | – | 1 | 5 | 20 |
| Team seats (Phase 4) | 1 | 1 | 3 | 10 |

**Trial:** every sign-up gets Pro for 14 days with no card, then drops to Free. This is set in `app.trial-days`.
Links keep working after a downgrade. Only the limits change.

**Why these prices:** Short.io charges $5, $18, $48 and $148, and Bitly charges more. Undercutting a little at the top
and staying near Short.io at the bottom gives local SMEs an easy yes, while API-heavy customers pay for Business.
Revisit after the first 50 paying customers.

### Payments

Stripe isn't available to Kenyan-registered businesses. It only works through an offshore company (US LLC, UK Ltd).
Recommended setup:

1. **Paystack** (primary): live for Kenyan merchants, takes **cards and M-Pesa**, and has a Plans/Subscriptions API.
   - **Cards** renew automatically through Paystack subscriptions.
   - **M-Pesa** can't be charged silently from the server. Each payment needs the customer to approve it in checkout.
     For M-Pesa subscribers, email or SMS a pay link a few days before renewal, with a grace period.
   - Flow: `POST /billing/checkout` creates a Paystack transaction or subscription and returns its `redirectUrl`. The
     frontend already redirects when `redirectUrl` is set. A Paystack **webhook** (`/api/v1/billing/webhook`, signature
     verified) then sets `plan` and `planRenewsAt`. Never trust the redirect alone.
2. **Alternatives:** IntaSend (Kenyan, M-Pesa and cards), Flutterwave, or direct Daraja (Safaricom) for the lowest M-Pesa fees.
3. **International customers:** add Stripe later through an offshore entity, or Paddle or Lemon Squeezy as merchant of record.

Check current fees and features with each provider before integrating.

### Getting the first customers
- Free tier and trial; a "Made with Kiungo" footer on link-in-bio pages
- Partnerships with SMS gateways (Africa's Talking, Advanta, Onfon) and their customers
- Content: "How to track your SMS campaign clicks", "Why your WhatsApp link clicks are inflated"
- Listings on Product Hunt, Kenyan startup communities, and the WordPress plugin directory

## Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-11-09 | Spring Boot + Angular | Owner's preference and existing IntelliJ/VS Code setup |
| 2026-11-09 | H2 for dev, Postgres for prod, Flyway migrations | Zero-setup local runs; one schema for both |
| 2026-11-09 | Store hashed IPs only | Privacy (Kenya DPA / GDPR) while still counting unique visitors |
| 2026-11-09 | Geo from CDN headers, not a GeoIP database | Free via Cloudflare; can add MaxMind GeoLite2 later |
| 2026-11-09 | Paystack for billing | Stripe unavailable for Kenyan entities; Paystack supports M-Pesa and cards |
