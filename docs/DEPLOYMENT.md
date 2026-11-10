# Deployment

## Recommended: one VPS with Docker Compose and Caddy, behind Cloudflare

This costs about **$6–12/month** and handles a lot of traffic. Caddy issues HTTPS certificates automatically, and
Cloudflare (free) adds country and city headers for analytics and absorbs bad traffic.

### 1. Server
- Create an Ubuntu 24.04 VPS with 2 GB RAM or more (Hetzner, DigitalOcean, Vultr or Linode; the Johannesburg or
  Frankfurt regions are closest to Kenya).
- Install Docker: `curl -fsSL https://get.docker.com | sh`
- Open ports 80 and 443 only: `ufw allow 22,80,443/tcp && ufw enable`

### 2. Domains and DNS (Cloudflare)
- Buy the app domain (e.g. `kiungo.app`) and a **short** link domain (`kgo.to`, `kiu.ng`, …).
- Add both to Cloudflare and create `A` records pointing to the VPS IP:
  - `app.kiungo.app`, proxied (orange cloud)
  - `kgo.to`, proxied
- In Cloudflare, set **SSL/TLS → Full (strict)**.
- For city data, turn on *Rules → Transform Rules → Managed Transforms → "Add visitor location headers"*.
  `CF-IPCountry` works without it.

### 3. Ship it
```bash
git clone https://github.com/<you>/urlshortener.git && cd urlshortener
cp deploy/.env.example deploy/.env
nano deploy/.env        # fill in domains and secrets (see below)
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Generate secrets:
```bash
openssl rand -base64 48    # JWT_SECRET
openssl rand -hex 16       # IP_HASH_SALT
```

### 4. Updates
```bash
git pull && docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```
Flyway applies any new migrations automatically on startup.

### 5. Backups (do this on day one)
```bash
# /etc/cron.daily/kiungo-backup
docker compose -f /root/urlshortener/deploy/docker-compose.prod.yml exec -T db \
  pg_dump -U kiungo kiungo | gzip > /root/backups/kiungo-$(date +%F).sql.gz
```
Copy backups off the server (Backblaze B2, S3 or Cloudflare R2) using `rclone`.

## Environment variables (backend)

| Variable | Example | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | `dev` uses H2 and seeds demo data |
| `DATABASE_URL` | `jdbc:postgresql://db:5432/kiungo` | |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` | | |
| `APP_BASE_URL` | `https://kgo.to` | Used to build `shortUrl` |
| `APP_FRONTEND_URL` | `https://app.kiungo.app` | Where "link unavailable" pages live |
| `APP_CORS_ORIGINS` | `https://app.kiungo.app` | Comma-separated |
| `JWT_SECRET` | 48+ random chars | **Required.** Changing it signs everyone out |
| `IP_HASH_SALT` | random | Changing it resets unique-visitor counting |
| `BILLING_MODE` | `mock` | Switch when Paystack is wired in (Phase 3) |
| `PORT` | `8080` | |

## Alternatives

| Option | Good for | Notes |
|---|---|---|
| **Railway / Render** | Least ops | Deploy `backend/` and `frontend/` as two services from their Dockerfiles and add their managed Postgres. Set the env vars above. |
| **Fly.io** | Global edge | `fly launch` in `backend/`; Fly Postgres or Neon |
| **AWS / GCP** | Later, at scale | ECS/Cloud Run + RDS/Cloud SQL |

## Local Docker
`docker compose up --build` at the repo root runs Postgres, the backend (:8080) and the frontend (:4200).
