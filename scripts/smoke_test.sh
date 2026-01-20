#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://its-peanuts-ai.onrender.com}"
BOOTSTRAP_TOKEN="${BOOTSTRAP_TOKEN:-Peanuts-Setup-2025!}"

CAND_EMAIL="${CAND_EMAIL:-candidate1@itspeanuts.ai}"
CAND_PASS="${CAND_PASS:-Test123!123}"
CAND_NAME="${CAND_NAME:-Candidate One}"

EMP_EMAIL="${EMP_EMAIL:-employer@itspeanuts.ai}"
EMP_PASS="${EMP_PASS:-Test123!123}"
EMP_NAME="${EMP_NAME:-Employer One}"

echo "== 1) register candidate (idempotent-ish; may fail if exists)"
curl -s -X POST "$BASE_URL/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$CAND_EMAIL\",\"password\":\"$CAND_PASS\",\"full_name\":\"$CAND_NAME\"}" >/dev/null || true

echo "== 2) candidate token"
CAND_TOKEN="$(curl -s -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-raw "username=$CAND_EMAIL&password=$CAND_PASS" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")"
echo "candidate token ok (${#CAND_TOKEN})"

echo "== 3) register employer (idempotent-ish; may fail if exists)"
curl -s -X POST "$BASE_URL/auth/register-employer" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMP_EMAIL\",\"password\":\"$EMP_PASS\",\"full_name\":\"$EMP_NAME\",\"bootstrap_token\":\"$BOOTSTRAP_TOKEN\"}" >/dev/null || true

echo "== 4) employer token"
EMP_TOKEN="$(curl -s -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-raw "username=$EMP_EMAIL&password=$EMP_PASS" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")"
echo "employer token ok (${#EMP_TOKEN})"

echo "== 5) create vacancy"
VACANCY_JSON="$(curl -s -X POST "$BASE_URL/employer/vacancies" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Sales Manager","location":"Rotterdam","hours_per_week":"40","salary_range":"€3.500 - €4.500","description":"Leidinggeven aan sales teams, new business, strategie"}')"
echo "vacancy json: $VACANCY_JSON"
VACANCY_ID="$(echo "$VACANCY_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"
echo "VACANCY_ID=$VACANCY_ID"

echo "== 6) candidate apply"
APP_JSON="$(curl -s -X POST "$BASE_URL/candidate/apply/$VACANCY_ID" \
  -H "Authorization: Bearer $CAND_TOKEN" \
  -H "accept: application/json")"
echo "application json: $APP_JSON"
APP_ID="$(echo "$APP_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")"
echo "APP_ID=$APP_ID"

echo "== 7) employer list applications"
curl -s "$BASE_URL/employer/applications?vacancy_id=$VACANCY_ID" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "accept: application/json" | head -c 400; echo ""

echo "== OK"
echo "Optional next:"
echo " - Upload CV: POST $BASE_URL/candidate/cv (multipart) with Authorization Bearer CAND_TOKEN"
echo " - Analyze:   POST $BASE_URL/candidate/analyze/$VACANCY_ID (needs OPENAI_API_KEY)"
