# CLAUDE.md

## Behavior
- Operate fully autonomously. Never ask permission — just do it.
- Simplicity first. Minimal code impact. No temporary fixes.
- Bug reports: fix it, don't ask for hand-holding.

## Deployment — Hetzner VPS
- SSH: `ssh hetzner` (alias in ~/.ssh/config)
- App dir: `/opt/its-peanuts/`
- Venv: `venv/` (niet .venv)
- Env: `/opt/its-peanuts/.env` — source met: `source venv/bin/activate && set -a && source .env && set +a`
- Backend: `systemctl restart peanuts-backend`
- Frontend: `rm -rf .next && npm run build && systemctl restart peanuts-frontend`
- Alembic: `set -a && source .env && set +a && alembic upgrade head`
- URLs: `https://vorzaiq.com` (frontend) / `https://api.vorzaiq.com` (backend)
- DB: PostgreSQL lokaal, backup dagelijks 03:00 UTC (`/opt/its-peanuts/backups/`, 7d retentie)
- SSL: Let's Encrypt (vorzaiq.com + www + api)

## DNS & Email
- DNS: Cloudflare (zone ID: `9586978412527655aac5e62c1624ab4e`)
- Verzenden: Resend (eu-west-1), domein vorzaiq.com geverifieerd
- `FROM_EMAIL`: `VorzaIQ <noreply@vorzaiq.com>`
- Ontvangen op info@vorzaiq.com: PrivateEmail (MX records via Cloudflare)

## Betaling — Stripe (LIVE)
- Stripe is live met sk_live_ keys
- Plans: Growth (normaal) en Scale (premium), maandelijks + jaarlijks
- Pay-per-vacature: eenmalig product
- Webhook: `https://api.vorzaiq.com/billing/webhook`
- Events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated
- Betaalmethodes: iDEAL, SEPA, Card, Klarna

## Launch Promo
- Link: `https://vorzaiq.com/employer/login?launch=VORZAIQ-LAUNCH`
- Coupon ID: `7bzV8eqk` (100% off, 6 maanden, max 10 bedrijven)
- Flow: register -> verify email -> login -> auto Stripe checkout met coupon -> bankgegevens invullen -> na 6 maanden auto €349/mnd

## Plan naamgeving
- Database `normaal` = UI `Growth`
- Database `premium` = UI `Scale`
- Database `gratis` = UI `Gratis`

## Launch Checklist
- [x] Stripe live mode
- [x] DB backup
- [x] SSL api.vorzaiq.com
- [x] Cookie consent + Privacy + AV
- [x] Launch promo (10 bedrijven, 6 mnd gratis Scale)
- [x] info@vorzaiq.com inbox
- [ ] KvK/BTW in factuur footer
- [ ] BOOKKEEPER_EMAIL op server
