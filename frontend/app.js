// VUL HIER JOUW BACKEND-URL IN, ZONDER /docs ERACHTER
// Bijvoorbeeld: const BACKEND_URL = "https://its-peanuts-ai-backend.onrender.com";
const BACKEND_URL = "https://its-peanuts-ai.onrender.com";



const cvInput = document.getElementById("cvInput");
const targetRoleInput = document.getElementById("targetRole");
const rewriteBtn = document.getElementById("rewriteBtn");
const cvResultBox = document.getElementById("cvResultBox");
const cvResult = document.getElementById("cvResult");
const cvError = document.getElementById("cvError");
// Elementen voor motivatiebrief
const letterCvInput = document.getElementById("letterCvInput");
const jobDescriptionInput = document.getElementById("jobDescriptionInput");
const companyNameInput = document.getElementById("companyNameInput");
const letterBtn = document.getElementById("letterBtn");
const letterResultBox = document.getElementById("letterResultBox");
const letterResult = document.getElementById("letterResult");
const letterError = document.getElementById("letterError");

rewriteBtn.addEventListener("click", async () => {
  const cvText = cvInput.value.trim();
  const targetRole = targetRoleInput.value.trim();

  cvError.classList.add("hidden");
  cvResultBox.classList.add("hidden");
  cvResult.textContent = "";

  if (!cvText) {
    cvError.textContent = "Vul eerst je CV-tekst in.";
    cvError.classList.remove("hidden");
    return;
  }

  rewriteBtn.disabled = true;
  rewriteBtn.textContent = "AI is bezig...";

  try {
    const response = await fetch(`${BACKEND_URL}/ai/rewrite-cv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cv_text: cvText,
        target_role: targetRole || null,
        language: "nl"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      cvError.textContent = `Er ging iets mis (${response.status}): ${errorText}`;
      cvError.classList.remove("hidden");
    } else {
      const data = await response.json();
      cvResult.textContent = data.rewritten_cv || "Geen resultaat ontvangen.";
      cvResultBox.classList.remove("hidden");
    }
  } catch (err) {
    cvError.textContent = "Kon geen contact maken met de server. Controleer de URL of probeer later opnieuw.";
    cvError.classList.remove("hidden");
    console.error(err);
  } finally {
    rewriteBtn.disabled = false;
    rewriteBtn.textContent = "Herschrijf mijn CV met AI";
  }
});

// Event voor motivatiebrief
letterBtn.addEventListener("click", async () => {
  const cvText = letterCvInput.value.trim();
  const jobText = jobDescriptionInput.value.trim();
  const companyName = companyNameInput.value.trim();

  letterError.classList.add("hidden");
  letterResultBox.classList.add("hidden");
  letterResult.textContent = "";

  if (!cvText) {
    letterError.textContent = "Vul eerst je CV-tekst in.";
    letterError.classList.remove("hidden");
    return;
  }

  if (!jobText) {
    letterError.textContent = "Vul eerst de vacaturetekst in.";
    letterError.classList.remove("hidden");
    return;
  }

  letterBtn.disabled = true;
  letterBtn.textContent = "AI is je brief aan het schrijven...";

  try {
    const response = await fetch(`${BACKEND_URL}/ai/motivation-letter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cv_text: cvText,
        job_description: jobText,
        company_name: companyName || null,
        language: "nl",
        tone: "professioneel"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      letterError.textContent = `Er ging iets mis (${response.status}): ${errorText}`;
      letterError.classList.remove("hidden");
    } else {
      const data = await response.json();
      letterResult.textContent = data.letter || "Geen motivatiebrief ontvangen.";
      letterResultBox.classList.remove("hidden");
    }
  } catch (err) {
    letterError.textContent = "Kon geen contact maken met de server. Controleer de URL of probeer later opnieuw.";
    letterError.classList.remove("hidden");
    console.error(err);
  } finally {
    letterBtn.disabled = false;
    letterBtn.textContent = "Schrijf mijn motivatiebrief met AI";
  }
});
