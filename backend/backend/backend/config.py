import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    # Voor nu laten we het zo; op Render zet je straks de OPENAI_API_KEY als environment variable.
    print("WAARSCHUWING: OPENAI_API_KEY is niet ingesteld.")
