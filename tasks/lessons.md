# Lessons Learned

## 2026-02-26 — Bug fix sessie

### OpenAI model namen controleren
- `gpt-4.1-mini` bestaat niet. Correct is `gpt-4o-mini`.
- Altijd controleer model-namen via OpenAI docs voor deployment.

### Orphaned directories veroorzaken Next.js routing bugs
- Next.js app router pikt ALLE directories in `app/` op als routes.
- `app/app/candidate/login/` genereert route `/app/candidate/login` i.p.v. `/candidate/login`.
- Bij structuur-opruiming altijd controleren op geneste duplicaten.

### Legacy flat files vs. Python packages
- Als `backend/models.py` naast `backend/models/` (package) staat, kan Python de verkeerde laden.
- Flat legacy file altijd verwijderen zodra het package de canonical source is.

### `.env.local` locatie bij Next.js
- Next.js leest `.env.local` alleen vanuit de root van het Next.js project.
- `frontend/frontend/.env.local` wordt NIET gelezen — dit was een stray directory.
- Correct pad: `frontend/.env.local`.

### database.py vs db.py
- Actieve code gebruikt `backend/db.py` (met postgres:// fix voor Render).
- `backend/database.py` was legacy, alleen gebruikt door niet-geregistreerde routers.
- Bij twijfel: grep op `from backend.database` om te checken welke bestanden het gebruiken.
