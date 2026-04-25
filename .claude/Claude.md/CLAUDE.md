# CLAUDE.md

## Behavior
- Operate fully autonomously. Never ask permission — just do it.
- Simplicity first. Minimal code impact. No temporary fixes.
- Bug reports: fix it, don't ask for hand-holding.

## Deployment — Hetzner VPS
- Server: `116.203.226.16`
- SSH: `ssh -i ~/.ssh/hetzner_key root@116.203.226.16`
- App dir: `/opt/its-peanuts/`
- Env: `/opt/its-peanuts/.env`
- Backend: `systemctl restart peanuts-backend`
- Frontend: `systemctl restart peanuts-frontend`
- URLs: `https://vorzaiq.com` (frontend) / `https://api.vorzaiq.com` (backend)
- DB: PostgreSQL lokaal, backup dagelijks 03:00 UTC (`/opt/its-peanuts/backups/`, 7d retentie)
- SSL: Let's Encrypt (vorzaiq.com + www + api)
- Monitoring: UptimeRobot op `/health`

## DNS & Email
- DNS: Cloudflare (jamie/mike.ns.cloudflare.com)
- Verzenden: Resend (eu-west-1), domein vorzaiq.com geverifieerd
- `FROM_EMAIL`: `VorzaIQ <noreply@vorzaiq.com>`
- `INVOICE_FROM_EMAIL`: `VorzaIQ <info@vorzaiq.com>`
- Ontvangen op info@vorzaiq.com: nog niet ingesteld

## Betaling
- Stripe (test mode — live na KvK)
- Setup script: `stripe_setup.py`

## Launch Checklist
- [ ] Stripe live mode (na KvK)
- [ ] KvK/BTW in footer
- [ ] info@vorzaiq.com inbox instellen
- [ ] BOOKKEEPER_EMAIL op server
- [ ] Test met echte betaling
- [x] DB backup
- [x] UptimeRobot
- [x] Cookie consent + Privacy + AV
- [x] Seed accounts beveiligd
- [x] SSL api.vorzaiq.com
