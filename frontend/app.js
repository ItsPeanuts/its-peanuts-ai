// VUL HIER JOUW BACKEND-URL IN, ZONDER /docs ERACHTER
const BACKEND_URL = "https://its-peanuts-ai.onrender.com";

// ---- TAB SWITCH (KANDIDAAT / WERKGEVER) ----
const navCandidate = document.getElementById("navCandidate");
const navEmployer = document.getElementById("navEmployer");
const candidateView = document.getElementById("candidateView");
const employerView = document.getElementById("employerView");

if (navCandidate && navEmployer && candidateView && employerView) {
  navCandidate.addEventListener("click", () => {
    navCandidate.classList.add("nav-pill-active");
    navCandidate.classList.remove("nav-pill-muted");
    navEmployer.classList.remove("nav-pill-active");
    navEmployer.classList.add("nav-pill-muted");

    candidateView.classList.remove("hidden");
    employerView.classList.add("hidden");
  });

  navEmployer.addEventListener("click", () => {
    navEmployer.classList.add("nav-pill-active");
    navEmployer.classList.remove("nav-pill-muted");
    navCandidate.classList.remove("nav-pill-active");
    navCandidate.classList.add("nav-pill-muted");

    employerView.classList.remove("hidden");
    candidateView.classList.add("hidden");
  });
}

// ---- KANDIDAAT: CV HERSCHRIJVEN ----
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

// Elementen voor matchscore
const matchCvInput = document.getElementById("matchCvInput");
const matchJobInput = document.getElementById("matchJobInput");
const matchBtn = document.getElementById("matchBtn");
const matchResultBox = document.getElementById("matchResultBox");
const matchResult = document.getElementById("matchResult");
const matchError = document.getElementById("matchError");

// ---- EVENT: CV HERSCHRIJVEN ----
if (rewriteBtn) {
  rewriteBtn.addEventListener("click", async () => {
    const cvText = (cvInput?.value || "").trim();
    const targetRole = (targetRoleInput?.value || "").trim();

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
}

// ---- EVENT: MOTIVATIEBRIEF ----
if (letterBtn) {
  letterBtn.addEventListener("click", async () => {
    const cvText = (letterCvInput?.value || "").trim();
    const jobText = (jobDescriptionInput?.value || "").trim();
    const companyName = (companyNameInput?.value || "").trim();

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
}

// ---- EVENT: MATCHSCORE ----
if (matchBtn) {
  matchBtn.addEventListener("click", async () => {
    const cvText = (matchCvInput?.value || "").trim();
    const jobText = (matchJobInput?.value || "").trim();

    matchError.classList.add("hidden");
    matchResultBox.classList.add("hidden");
    matchResult.textContent = "";

    if (!cvText) {
      matchError.textContent = "Vul eerst je CV-tekst in.";
      matchError.classList.remove("hidden");
      return;
    }

    if (!jobText) {
      matchError.textContent = "Vul eerst de vacaturetekst in.";
      matchError.classList.remove("hidden");
      return;
    }

    matchBtn.disabled = true;
    matchBtn.textContent = "AI berekent match...";

    try {
      const response = await fetch(`${BACKEND_URL}/ai/match-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          candidate_profile_text: cvText,
          job_description: jobText
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        matchError.textContent = `Er ging iets mis (${response.status}): ${errorText}`;
        matchError.classList.remove("hidden");
      } else {
        const data = await response.json();
        matchResult.textContent = `Score: ${data.match_score}/100\n\nUitleg:\n${data.explanation || "Geen uitleg ontvangen."}`;
        matchResultBox.classList.remove("hidden");
      }
    } catch (err) {
      matchError.textContent = "Kon geen contact maken met de server.";
      matchError.classList.remove("hidden");
      console.error(err);
    } finally {
      matchBtn.disabled = false;
      matchBtn.textContent = "Bereken matchscore";
    }
  });
}

// ---- WERKGEVER: TRIAL-ACCOUNT AANMAKEN ----
const empCompanyName = document.getElementById("empCompanyName");
const empKvk = document.getElementById("empKvk");
const empVat = document.getElementById("empVat");
const empContactName = document.getElementById("empContactName");
const empContactEmail = document.getElementById("empContactEmail");
const empContactPhone = document.getElementById("empContactPhone");
const empIban = document.getElementById("empIban");
const empAccountHolder = document.getElementById("empAccountHolder");
const empSubmitBtn = document.getElementById("empSubmitBtn");
const empResultBox = document.getElementById("empResultBox");
const empResult = document.getElementById("empResult");
const empError = document.getElementById("empError");

if (empSubmitBtn) {
  empSubmitBtn.addEventListener("click", async () => {
    const name = (empCompanyName?.value || "").trim();
    const kvk = (empKvk?.value || "").trim();
    const vat = (empVat?.value || "").trim();
    const contactName = (empContactName?.value || "").trim();
    const contactEmail = (empContactEmail?.value || "").trim();
    const contactPhone = (empContactPhone?.value || "").trim();
    const iban = (empIban?.value || "").trim();
    const accountHolder = (empAccountHolder?.value || "").trim();

    empError.classList.add("hidden");
    empResultBox.classList.add("hidden");
    empResult.textContent = "";

    if (!name || !contactEmail) {
      empError.textContent = "Vul minimaal bedrijfsnaam en e-mailadres in.";
      empError.classList.remove("hidden");
      return;
    }

    empSubmitBtn.disabled = true;
    empSubmitBtn.textContent = "Account wordt aangemaakt...";

    try {
      const response = await fetch(`${BACKEND_URL}/ats/companies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          kvk_number: kvk || null,
          vat_number: vat || null,
          contact_name: contactName || null,
          contact_email: contactEmail,
          contact_phone: contactPhone || null,
          iban: iban || null,
          account_holder: accountHolder || null
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        empError.textContent = `Er ging iets mis (${response.status}): ${errorText}`;
        empError.classList.remove("hidden");
      } else {
        const data = await response.json();
        empResult.textContent =
          `Bedrijf-ID: ${data.id}\n` +
          `Bedrijfsnaam: ${data.name}\n` +
          `E-mail: ${data.contact_email}\n` +
          `Abonnement: ${data.billing_plan}\n` +
          `Trial vacatures gebruikt: ${data.trial_jobs_used}`;
        empResultBox.classList.remove("hidden");
      }
    } catch (err) {
      empError.textContent = "Kon geen contact maken met de server. Controleer de URL of probeer later opnieuw.";
      empError.classList.remove("hidden");
      console.error(err);
    } finally {
      empSubmitBtn.disabled = false;
      empSubmitBtn.textContent = "Maak mijn gratis trial-account aan";
    }
  });
}

