FROM python:3.11-slim

WORKDIR /app

# Installeer dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopieer code
COPY . .

EXPOSE 8000

# Migraties uitvoeren dan uvicorn starten
CMD ["sh", "-c", "alembic upgrade head && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --ws websockets"]
