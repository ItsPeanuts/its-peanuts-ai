#!/usr/bin/env python3
"""
Diagnostisch testscript voor Lisa Chatbot + Virtuele Lisa
Runt tegen de live backend op Render.com

Gebruik: python test_lisa.py
"""

import asyncio
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://its-peanuts-backend.onrender.com"
WS_BASE = "wss://its-peanuts-backend.onrender.com"

# Test accounts
ADMIN_EMAIL = "admin@itspeanuts.ai"
ADMIN_PASSWORD = "AdminPeanuts2025!"
CANDIDATE_EMAIL = "kandidaat@test.nl"
CANDIDATE_PASSWORD = "TestPeanuts2025!"
EMPLOYER_EMAIL = "werkgever@test.nl"
EMPLOYER_PASSWORD = "TestPeanuts2025!"

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
INFO = "\033[94mℹ\033[0m"
WARN = "\033[93m⚠\033[0m"

results = []


def http_post(path, data, token=None, timeout=20, form=False):
    url = BASE + path
    if form:
        body = urllib.parse.urlencode(data).encode()
        content_type = "application/x-www-form-urlencoded"
    else:
        body = json.dumps(data).encode()
        content_type = "application/json"
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", content_type)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    resp = urllib.request.urlopen(req, timeout=timeout)
    return json.loads(resp.read())


def http_get(path, token=None, timeout=20):
    url = BASE + path
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    resp = urllib.request.urlopen(req, timeout=timeout)
    return json.loads(resp.read())


def step(name):
    print(f"\n{'─'*60}")
    print(f"  {name}")
    print(f"{'─'*60}")


def ok(msg, detail=""):
    results.append(("PASS", msg))
    print(f"  {PASS}  {msg}")
    if detail:
        print(f"         {detail}")


def fail(msg, detail=""):
    results.append(("FAIL", msg))
    print(f"  {FAIL}  {msg}")
    if detail:
        print(f"         \033[91m{detail}\033[0m")


def info(msg):
    print(f"  {INFO}  {msg}")


# ── 1. Wake up backend ─────────────────────────────────────────────────────────

step("STAP 1: Backend opstarten (max 90 seconden)")
info(f"Ping: {BASE}/health")

woke = False
for i in range(30):
    try:
        req = urllib.request.Request(BASE + "/health")
        resp = urllib.request.urlopen(req, timeout=8)
        data = json.loads(resp.read())
        if data.get("status") == "ok":
            woke = True
            if i == 0:
                ok("Backend al actief")
            else:
                ok(f"Backend opgestart na {i * 3} seconden ({i} pogingen)")
            break
    except Exception as e:
        elapsed = (i + 1) * 3
        print(f"  {WARN}  [{elapsed:3d}s] Backend slaapt nog... ({e})")
        time.sleep(3)

if not woke:
    fail("Backend niet bereikbaar na 90 seconden — stop hier")
    sys.exit(1)


# ── 2. Login ───────────────────────────────────────────────────────────────────

step("STAP 2: Inloggen")

admin_token = None
candidate_token = None

try:
    r = http_post("/auth/login", {"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, form=True)
    admin_token = r.get("access_token")
    if admin_token:
        ok(f"Admin login succesvol ({ADMIN_EMAIL})")
    else:
        fail(f"Admin login: geen token in response", str(r))
except Exception as e:
    fail(f"Admin login mislukt", str(e))

try:
    r = http_post("/auth/login", {"username": CANDIDATE_EMAIL, "password": CANDIDATE_PASSWORD}, form=True)
    candidate_token = r.get("access_token")
    if candidate_token:
        ok(f"Kandidaat login succesvol ({CANDIDATE_EMAIL})")
    else:
        fail(f"Kandidaat login: geen token in response", str(r))
except Exception as e:
    fail(f"Kandidaat login mislukt", str(e))

employer_token = None
try:
    r = http_post("/auth/login", {"username": EMPLOYER_EMAIL, "password": EMPLOYER_PASSWORD}, form=True)
    employer_token = r.get("access_token")
    if employer_token:
        ok(f"Werkgever login succesvol ({EMPLOYER_EMAIL})")
    else:
        fail(f"Werkgever login: geen token", str(r))
except Exception as e:
    fail(f"Werkgever login mislukt", str(e))

if not admin_token and not candidate_token:
    fail("Geen enkel token beschikbaar — stop hier")
    sys.exit(1)

token = admin_token or candidate_token


# ── 3. Testdata aanmaken indien nodig + sollicitatie ophalen ───────────────────

step("STAP 3: Testdata controleren / aanmaken")

app_id = None

# Eerst kijken of er al sollicitaties zijn
try:
    apps = http_get("/candidate/applications", token=candidate_token)
    if isinstance(apps, list) and len(apps) > 0:
        app_id = apps[0].get("id")
        ok(f"{len(apps)} sollicitatie(s) gevonden, eerste id={app_id}")
        for a in apps[:3]:
            info(f"  app_id={a.get('id')}  status={a.get('status')}  vacature={a.get('vacancy_title', '?')}")
except Exception as e:
    info(f"Kandidaat applications endpoint: {e}")

if not app_id:
    info("Geen sollicitaties — testdata aanmaken (vacature + sollicitatie)...")

    # Vacature aanmaken als werkgever
    vacancy_id = None
    if employer_token:
        try:
            # Eerst bestaande vacatures ophalen
            vacancies = http_get("/employer/vacancies", token=employer_token)
            if isinstance(vacancies, list) and len(vacancies) > 0:
                vacancy_id = vacancies[0].get("id")
                info(f"Bestaande vacature gevonden: id={vacancy_id}")
            else:
                # Nieuwe vacature aanmaken
                v = http_post("/employer/vacancies", {
                    "title": "Test Software Developer",
                    "description": "Testfunctie voor geautomatiseerde tests. Zoeken naar een ervaren developer.",
                    "location": "Amsterdam",
                    "employment_type": "fulltime",
                }, token=employer_token)
                vacancy_id = v.get("id")
                info(f"Nieuwe vacature aangemaakt: id={vacancy_id}")
        except Exception as e:
            info(f"Vacature aanmaken mislukt: {e}")

    # Vacature opzoeken als public
    if not vacancy_id:
        try:
            vacancies = http_get("/vacancies", timeout=10)
            if isinstance(vacancies, list) and len(vacancies) > 0:
                vacancy_id = vacancies[0].get("id")
                info(f"Publieke vacature gevonden: id={vacancy_id}")
        except Exception as e:
            info(f"Publieke vacatures: {e}")

    # Sollicitatie aanmaken als kandidaat
    if vacancy_id and candidate_token:
        try:
            app = http_post(f"/vacancies/{vacancy_id}/apply", {
                "motivation": "Dit is een testsolllicitatie voor geautomatiseerde tests.",
            }, token=candidate_token)
            app_id = app.get("id")
            if app_id:
                ok(f"Testsolllicitatie aangemaakt: app_id={app_id}")
            else:
                info(f"Sollicitatie response: {app}")
        except urllib.error.HTTPError as e:
            body = ""
            try: body = e.read().decode()
            except Exception: pass
            if e.code == 409:
                info("Sollicitatie bestaat al (409) — ophalen via applications endpoint")
                try:
                    apps = http_get("/candidate/applications", token=candidate_token)
                    if isinstance(apps, list) and len(apps) > 0:
                        app_id = apps[0].get("id")
                        ok(f"Bestaande sollicitatie gevonden: app_id={app_id}")
                except Exception as e2:
                    fail("Ophalen bestaande sollicitatie mislukt", str(e2))
            else:
                fail(f"Sollicitatie aanmaken mislukt HTTP {e.code}", body[:200])
        except Exception as e:
            fail(f"Sollicitatie aanmaken mislukt", str(e))

if not app_id:
    fail("Geen app_id beschikbaar — CHAT, VIRTUAL en TTS tests worden overgeslagen")


# ── 4. Lisa Chatbot (WebSocket) ────────────────────────────────────────────────

step("STAP 4: Lisa Chatbot — WebSocket test")

async def test_websocket(app_id: int, token: str) -> tuple[bool, str]:
    """Test WebSocket verbinding en wacht op eerste bericht van Lisa."""
    try:
        import websockets
    except ImportError:
        return False, "websockets package niet geïnstalleerd — run: pip install websockets"

    url = f"{WS_BASE}/ws/chat/{app_id}?token={token}"
    info(f"Verbinding met: {url[:60]}...")

    try:
        async with websockets.connect(url, open_timeout=15) as ws:
            # Wacht max 30 sec op een bericht (opening message van Lisa of bestaande chat)
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=30)
                msg = json.loads(raw)

                if msg.get("error"):
                    return False, f"Server stuurde fout: {msg['error']}"

                role = msg.get("role", "?")
                content = (msg.get("content") or "")[:80]
                return True, f"Ontvangen bericht van '{role}': \"{content}...\""

            except asyncio.TimeoutError:
                return False, "Timeout: geen bericht ontvangen binnen 30 seconden"

    except Exception as e:
        return False, f"WebSocket fout: {type(e).__name__}: {e}"


if app_id:
    ws_token = candidate_token or admin_token
    success, detail = asyncio.run(test_websocket(app_id, ws_token))
    if success:
        ok("WebSocket verbinding OK + bericht ontvangen", detail)
    else:
        fail("WebSocket test mislukt", detail)

        # Extra diagnostiek: check of de WS route bestaat
        info("Extra check: is /ws/chat route beschikbaar?")
        try:
            # HTTP GET op WS endpoint geeft 403/404/405, maar backend is bereikbaar
            req = urllib.request.Request(BASE + f"/ws/chat/{app_id}")
            urllib.request.urlopen(req, timeout=5)
        except urllib.error.HTTPError as e:
            info(f"HTTP response op /ws/chat: {e.code} (route bestaat wel als dit niet 404 is)")
        except Exception as e:
            info(f"HTTP check op /ws/chat: {e}")
else:
    info("Overgeslagen (geen app_id)")


# ── 5. Virtuele Lisa (HTTP) ────────────────────────────────────────────────────

step("STAP 5: Virtuele Lisa — /virtual-interview/session/{id}/start")

if app_id:
    # Admin bypasses premium check
    test_token = admin_token or candidate_token
    info(f"POST {BASE}/virtual-interview/session/{app_id}/start")
    try:
        r = http_post(f"/virtual-interview/session/{app_id}/start", {}, token=test_token, timeout=20)
        tts_mode = r.get("tts_mode")
        did_stream_id = r.get("did_stream_id", "?")
        session_id = r.get("session_id", "?")

        if tts_mode is True:
            ok("Virtuele Lisa start OK — TTS modus (geen D-ID nodig)", f"session_id={session_id}, did_stream_id={did_stream_id}")
        elif tts_mode is False and did_stream_id not in ("tts-fallback", "?", ""):
            ok("Virtuele Lisa start OK — D-ID modus actief", f"did_stream_id={did_stream_id}")
        else:
            ok("Virtuele Lisa endpoint bereikbaar", f"response={r}")

    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode()
        except Exception:
            pass
        fail(f"HTTP {e.code} bij virtual-interview/start", body[:200])

        if e.code == 403:
            info("403 = geen toegang. Mogelijke oorzaken:")
            info("  - Kandidaat hoort niet bij deze sollicitatie")
            info("  - Werkgever heeft geen premium plan (admin omzeilt dit)")
            info("  - Sollicitatie al afgerond (409)")
        elif e.code == 409:
            ok("409 Conflict = interview al eerder afgerond (normaal gedrag)", "Sessie bestaat al")
        elif e.code == 500:
            info("500 = interne fout in backend — bekijk Render.com logs")
    except Exception as e:
        fail(f"Onverwachte fout bij virtual-interview/start", str(e))
else:
    info("Overgeslagen (geen app_id)")


# ── 6. OpenAI TTS endpoint ─────────────────────────────────────────────────────

step("STAP 6: OpenAI TTS — /virtual-interview/session/{id}/tts")

if app_id:
    test_token = candidate_token or admin_token
    info(f"POST {BASE}/virtual-interview/session/{app_id}/tts")
    try:
        url = BASE + f"/virtual-interview/session/{app_id}/tts"
        body = json.dumps({"text": "Hallo, ik ben Lisa. Dit is een test van de spraaksynthese."}).encode()
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", f"Bearer {test_token}")
        resp = urllib.request.urlopen(req, timeout=30)
        audio_data = resp.read()
        content_type = resp.headers.get("Content-Type", "?")
        size_kb = len(audio_data) // 1024

        if len(audio_data) > 1000 and "audio" in content_type:
            ok(f"OpenAI TTS OK — {size_kb} KB MP3 audio ontvangen", f"Content-Type: {content_type}")
        elif len(audio_data) > 0:
            ok(f"TTS endpoint bereikbaar ({size_kb} KB)", f"Content-Type: {content_type}")
        else:
            fail("TTS endpoint gaf lege response")

    except urllib.error.HTTPError as e:
        body_txt = ""
        try: body_txt = e.read().decode()
        except Exception: pass
        if e.code == 503:
            fail("HTTP 503 — OpenAI API key niet geconfigureerd op Render", body_txt[:200])
            info("Stel OPENAI_API_KEY in via Render dashboard → Environment Variables")
        elif e.code == 403:
            fail("HTTP 403 — geen toegang tot dit interview", body_txt[:200])
        elif e.code == 404:
            fail("HTTP 404 — TTS endpoint niet gevonden (nieuwe code nog niet gedeployed?)", body_txt[:100])
        else:
            fail(f"HTTP {e.code} bij TTS endpoint", body_txt[:200])
    except Exception as e:
        fail(f"TTS endpoint fout", str(e))
else:
    info("Overgeslagen (geen app_id)")


# ── Samenvatting ───────────────────────────────────────────────────────────────

step("SAMENVATTING")

passed = sum(1 for r in results if r[0] == "PASS")
failed = sum(1 for r in results if r[0] == "FAIL")

print(f"\n  Totaal: {len(results)} tests")
print(f"  {PASS}: {passed}")
print(f"  {FAIL}: {failed}")

if failed > 0:
    print("\n  Mislukte tests:")
    for r in results:
        if r[0] == "FAIL":
            print(f"    - {r[1]}")

print()

if failed == 0:
    print("  \033[92mAlle tests geslaagd!\033[0m")
elif passed == 0:
    print("  \033[91mAlle tests mislukt — backend probleem\033[0m")
else:
    print("  \033[93mSommige tests geslaagd, bekijk de fouten hierboven.\033[0m")

print()
