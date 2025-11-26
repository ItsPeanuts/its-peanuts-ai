// VUL HIER JOUW BACKEND-URL IN, ZONDER /docs ERACHTER
// Bijvoorbeeld: const BACKEND_URL = "https://its-peanuts-ai-backend.onrender.com";
const BACKEND_URL = "https://its-peanuts-ai-backend.onrender.com";


const cvInput = document.getElementById("cvInput");
const targetRoleInput = document.getElementById("targetRole");
const rewriteBtn = document.getElementById("rewriteBtn");
const cvResultBox = document.getElementById("cvResultBox");
const cvResult = document.getElementById("cvResult");
const cvError = document.getElementById("cvError");

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
