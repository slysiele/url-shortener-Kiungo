# Kiungo API (v1)

The interactive reference, where you can try every call, is at **`/swagger-ui.html`**. The raw OpenAPI spec is at
`/v3/api-docs`. You can import that spec into Postman or Insomnia, or generate an SDK with `openapi-generator`.

## Authentication

Create a key in the dashboard under **Integrations & API** (Starter plan and up), then send it on every request:

```
X-API-Key: kk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Keep keys on your server. Don't put them in browser or mobile code.

## Rate limits

| Plan | Requests / minute |
|---|---|
| Starter | 60 |
| Pro | 300 |
| Business | 1,000 |

Every response includes `X-RateLimit-Limit` and `X-RateLimit-Remaining`. Over the limit you get `429` with a
`Retry-After` header.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/v1/links` | Create a short link |
| `POST` | `/api/v1/links/bulk` | Create up to 500 links in one call |
| `GET` | `/api/v1/links?q=&page=&size=` | List and search your links |
| `GET` | `/api/v1/links/{id}` | Get a link |
| `GET` | `/api/v1/links/by-slug/{slug}` | Get a link by slug |
| `PATCH` | `/api/v1/links/{id}` | Update only the fields you send |
| `DELETE` | `/api/v1/links/{id}` | Delete a link and its clicks |
| `GET` | `/api/v1/links/{id}/qr?size=&fg=&bg=` | QR code PNG |
| `POST` | `/api/v1/links/import` | CSV upload (multipart, field `file`) |
| `GET` | `/api/v1/links/export` | All links as CSV |
| `GET` | `/api/v1/stats?days=&linkId=&tz=&humanOnly=` | Aggregated stats |
| `GET` | `/api/v1/stats/clicks?linkId=&page=&size=` | Raw click stream |
| `GET` | `/api/v1/billing/plans` | Public price list (no auth) |

## Examples

**Create**

```bash
curl -X POST https://kiun.go/api/v1/links \
  -H "X-API-Key: $KIUNGO_KEY" -H "Content-Type: application/json" \
  -d '{
        "url": "https://shop.co.ke/black-friday",
        "slug": "bf26",
        "title": "Black Friday SMS",
        "tags": ["sms", "sales"],
        "expiresAt": "2026-11-30T23:59:00Z",
        "maxClicks": 50000
      }'
```

```json
{
  "id": 42, "slug": "bf26", "shortUrl": "https://kiun.go/bf26",
  "originalUrl": "https://shop.co.ke/black-friday", "title": "Black Friday SMS",
  "tags": ["sms", "sales"], "clickCount": 0, "status": "ACTIVE", "createdAt": "2026-11-09T17:00:00Z"
}
```

**Stats for one link, last 7 days, Nairobi time**

```bash
curl "https://kiun.go/api/v1/stats?days=7&linkId=42&tz=Africa/Nairobi" -H "X-API-Key: $KIUNGO_KEY"
```

**Pause a link**

```bash
curl -X PATCH https://kiun.go/api/v1/links/42 -H "X-API-Key: $KIUNGO_KEY" \
  -H "Content-Type: application/json" -d '{"active": false}'
```

## Errors

Every error has the same shape:

```json
{ "status": 409, "code": "SLUG_TAKEN", "message": "The slug 'bf26' is already taken", "fields": null }
```

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_FAILED` | See `fields` for each problem |
| 400 | `INVALID_URL`, `INVALID_SLUG`, `INVALID_EXPIRY` | Fix the input |
| 401 | `UNAUTHORIZED` | Missing, wrong or revoked key, or your plan no longer includes the API |
| 402 | `PLAN_LIMIT` | Monthly link quota reached, or the feature needs a higher plan |
| 404 | `NOT_FOUND` | No such link in your account |
| 409 | `SLUG_TAKEN` | Choose another slug |
| 429 | `RATE_LIMITED` | Slow down; see `Retry-After` |

## Redirect behaviour (for the short links themselves)

- `GET https://kiun.go/{slug}` returns `302` to the destination.
- Query strings are forwarded: `kiun.go/bf26?utm_source=sms` goes to `…/black-friday?utm_source=sms`.
- iPhone and Android visitors go to `iosUrl` or `androidUrl` when those are set.
- If the link is unknown, paused, expired or over its limit, the visitor sees a friendly page explaining why.
