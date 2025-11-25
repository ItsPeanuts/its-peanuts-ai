import os
from dotenv import load_dotenv

# Laad variabelen uit een .env bestand (lokaal) of van de server (Render)
load_dotenv()

# Hier halen we je OpenAI API key op
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    # Dit is niet erg tijdens bouwen, maar op de server moet je deze key zetten.
    print("WAARSCHUWING: OPENAI_API_KEY is niet ingesteld.")
