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
- Backend: `sudo systemctl restart peanuts-backend`
- Frontend: `rm -rf .next && npm run build && sudo systemctl restart peanuts-frontend`
- Migraties: `set -a && source .env && set +a && venv/bin/python -m backend.migrations.<script>`
- URLs: `https://www.vorzaiq.com` (frontend) / `https://api.vorzaiq.com` (backend)
- DB: PostgreSQL lokaal, backup dagelijks 03:00 UTC (`/opt/its-peanuts/backups/`, 7d retentie)
- SSL: Let's Encrypt (vorzaiq.com + www + api)
- ⚠ Next.js build race condition: ENOENT `build-manifest.json` kan voorkomen. Oplossing: gewoon retry `rm -rf .next && npm run build`.

## DNS & Email
- DNS: Cloudflare (zone ID: `9586978412527655aac5e62c1624ab4e`)
- non-www → www 301 redirect via next.config.js
- Verzenden: Resend (eu-west-1), domein vorzaiq.com geverifieerd
- `FROM_EMAIL`: `VorzaIQ <noreply@vorzaiq.com>`
- Ontvangen op info@vorzaiq.com: PrivateEmail (MX records via Cloudflare)

## Betaling — Stripe (LIVE)
- Stripe is live met sk_live_ keys
- Plans: Growth (normaal) en Scale (premium), maandelijks + jaarlijks
- Pay-per-vacature: eenmalig product (€89)
- Webhook: `https://api.vorzaiq.com/billing/webhook`
- Events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated
- Betaalmethodes: iDEAL, SEPA, Card, Klarna

## Growth Trial (promotie)
- Nieuwe werkgevers krijgen automatisch Growth plan + 30 dagen gratis trial
- Na registratie + email verificatie + eerste login → auto-redirect naar Stripe Checkout
- Stripe subscription met `trial_period_days` → kaart geregistreerd maar niet afgeschreven
- Na 30 dagen → automatisch €149/maand afgeschreven door Stripe
- Safety net: als trial verloopt zonder Stripe subscription → plan wordt "gratis"
- Vacancy limiet Growth: **5 vacatures** (niet 10!)

## Launch Promo (Scale)
- Link: `https://vorzaiq.com/employer/login?launch=VORZAIQ-LAUNCH`
- Coupon ID: `7bzV8eqk` (100% off, 6 maanden, max 10 bedrijven)
- Flow: register -> verify email -> login -> auto Stripe checkout met coupon -> bankgegevens invullen -> na 6 maanden auto €349/mnd

## Plan naamgeving & limieten
- Database `normaal` = UI `Growth` → 5 vacatures, €149/mnd
- Database `premium` = UI `Scale` → onbeperkt, €349/mnd
- Database `gratis` = UI `Gratis` → 1 vacature

## Registratie & Voorwaarden
- Alle registratieflows vereisen `terms_accepted` checkbox (kandidaat + werkgever)
- Server-side validatie: 422 als `terms_accepted` niet `true` is
- Opgeslagen op User: `terms_accepted_at` (timestamp) + `terms_version` (bijv. "2026-07")
- Bestaande accounts niet geraakt (nullable kolommen)
- Voorwaarden: `/voorwaarden`, Privacy: `/privacy` — meertalig (NL + EN)
- Geen Alembic: migraties in `backend/migrations/`, handmatig draaien met venv

## Virtual Lisa (video-interview)
- Tijdelijk uitgeschakeld (pauze, niet verwijderd)
- Backend: `interview_required = False` in `candidate_applications.py`
- Frontend: `LISA_MAINTENANCE = true` in `candidate/interview/[id]/page.tsx`
- Chatbot Lisa (tekst) werkt gewoon

## i18n
- 5 talen: nl, en, de, fr, es
- Context-based: `useLanguage()` hook → `{ lang, T }`
- Vertalingen: `frontend/lib/translations.ts`
- IP-detectie + `?lang=XX` override + localStorage user-keuze
- Alle UI strings via `T.section.key`, nooit hardcoded

## SEO
- metadataBase in layout.tsx, title template `%s | VorzaIQ`
- Canonical URLs op alle pagina's (www.vorzaiq.com)
- JSON-LD: Organization + WebSite op homepage, ItemList op /vacatures, JobPosting op /vacatures/[id]
- Sitemap: `frontend/app/sitemap.ts` (statisch + dynamische vacatures)
- Google Search Console: verificatie meta tag in layout

## Cross-promo
- VorzaPDF link in footer (`PublicFooter.tsx`) + `PdfToWordTip.tsx` component op CV-upload pagina's
- UTM params: `utm_source=vorzaiq&utm_medium=referral&utm_campaign=...`

## Launch Checklist
- [x] Stripe live mode
- [x] DB backup
- [x] SSL api.vorzaiq.com
- [x] Cookie consent + Privacy + AV
- [x] Launch promo (10 bedrijven, 6 mnd gratis Scale)
- [x] info@vorzaiq.com inbox
- [x] SEO sweep (metadata, canonicals, JSON-LD, sitemap)
- [x] Growth trial auto-billing via Stripe
- [x] Favicon + OG image
- [ ] KvK/BTW in factuur footer
- [ ] BOOKKEEPER_EMAIL op server
