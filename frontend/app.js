// BACKEND URL (ZONDER /docs)
const BACKEND_URL = "https://its-peanuts-ai.onrender.com";

// Keys voor localStorage
const SELECTED_JOB_FOR_AI_KEY = "its_peanuts_selected_job_for_ai";
const CANDIDATE_PROFILE_KEY = "its_peanuts_candidate_profile";

// ------------- CANDIDATE PROFIEL (alleen in browser) -------------

function saveCandidateProfile(cvText) {
  if (!cvText) return;
  const profile = { cv_text: cvText, updated_at: new Date().toISOString() };
  try {
    localStorage.setItem(CANDIDATE_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn("Kon kandidaat-profiel niet opslaan:", e);
  }
}

function loadCandidateProfile() {
  try {
    const raw = localStorage.getItem(CANDIDATE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Kon kandidaat-profiel niet lezen:", e);
    return null;
  }
}

// ------------------ TAB SWITCH (KANDIDAAT / WERKGEVER) ------------------
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

// ------------------ KANDIDAAT: CV / MOTIVATIE / MATCH ------------------

let lastRawCvText = "";
let lastRewrittenCvText = "";

// Elementen
const cvInput = document.getElementById("cvInput");
const cvFileInput = document.getElementById("cvFileInput");
const targetRoleInput = document.getElementById("targetRole");
const rewriteBtn = document.getElementById("rewriteBtn");
const cvResultBox = document.getElementById("cvResultBox");
const cvResult = document.getElementById("cvResult");
const cvError = document.getElementById("cvError");

const letterCvInput = document.getElementById("letterCvInput");
const jobDescriptionInput = document.getElementById("jobDescriptionInput");
const companyNameInput = document.getElementById("companyNameInput");
const letterBtn = document.getElementById("letterBtn");
const letterResultBox = document.getElementById("letterResultBox");
const letterResult = document.getElementById("letterResult");
const letterError = document.getElementById("letterError");

const matchCvInput = document.getElementById("matchCvInput");
const matchJobInput = document.getElementById("matchJobInput");
const matchBtn = document.getElementById("matchBtn");
const matchResultBox = document.getElementById("matchResultBox");
const matchResult = document.getElementById("matchResult");
const matchError = document.getElementById("matchError");

// --- Vul velden automatisch als je via jobs.html komt ---
(function prefillJobFromStorage() {
  try {
    const raw = localStorage.getItem(SELECTED_JOB_FOR_AI_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    const description = data.description || "";
    const companyName = data.company_name || "";

    if (jobDescriptionInput && description && !jobDescriptionInput.value.trim()) {
      jobDescriptionInput.value = description;
    }
    if (matchJobInput && description && !matchJobInput.value.trim()) {
      matchJobInput.value = description;
    }
    if (companyNameInput && companyName && !companyNameInput.value.trim()) {
      companyNameInput.value = companyName;
    }

    // Eén keer gebruiken, daarna weghalen
    localStorage.removeItem(SELECTED_JOB_FOR_AI_KEY);
  } catch (e) {
    console.warn("Kon geselecteerde vacature niet lezen:", e);
  }
})();

// --- CV upload .txt ---
if (cvFileInput) {
  cvFileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type && file.type !== "text/plain") {
      alert("Voor nu ondersteunen we alleen .txt bestanden. Je kunt anders je CV tekst plakken.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result || "";
      if (cvInput) {
        cvInput.value = text;
      }
    };
    reader.readAsText(file);
  });
}

// --- CV herschrijven ---
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

    lastRawCvText = cvText;

    rewriteBtn.disabled = true;
    rewriteBtn.textContent = "AI is bezig...";

    try {
      const response = await fetch(`${BACKEND_URL}/ai/rewrite-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const rewritten = data.rewritten_cv || "Geen resultaat ontvangen.";

        cvResult.textContent = rewritten;
        cvResultBox.classList.remove("hidden");

        lastRewrittenCvText = rewritten;

        // PROFIEL CV OPSLAAN
        saveCandidateProfile(rewritten);

        // Automatisch doorschuiven naar motivatie + match
        if (letterCvInput && !letterCvInput.value.trim()) {
          letterCvInput.value = rewritten;
        }
        if (matchCvInput && !matchCvInput.value.trim()) {
          matchCvInput.value = rewritten;
        }
      }
    } catch (err) {
      cvError.textContent =
        "Kon geen contact maken met de server. Controleer de URL of probeer later opnieuw.";
      cvError.classList.remove("hidden");
      console.error(err);
    } finally {
      rewriteBtn.disabled = false;
      rewriteBtn.textContent = "Herschrijf mijn CV met AI";
    }
  });
}

// --- Motivatiebrief ---
if (letterBtn) {
  letterBtn.addEventListener("click", async () => {
    let cvText = (letterCvInput?.value || "").trim();
    const jobText = (jobDescriptionInput?.value || "").trim();
    const companyName = (companyNameInput?.value || "").trim();

    letterError.classList.add("hidden");
    letterResultBox.classList.add("hidden");
    letterResult.textContent = "";

    if (!cvText && lastRewrittenCvText) {
      cvText = lastRewrittenCvText;
      if (letterCvInput) {
        letterCvInput.value = lastRewrittenCvText;
      }
    }

    if (!cvText) {
      letterError.textContent =
        "Vul eerst je CV-tekst in (of laat AI eerst je CV herschrijven).";
      letterError.classList.remove("hidden");
      return;
    }

    if (!jobText) {
      letterError.textContent =
        "Vul eerst de vacaturetekst in (of kies een vacature via de vacatures-pagina).";
      letterError.classList.remove("hidden");
      return;
    }

    letterBtn.disabled = true;
    letterBtn.textContent = "AI is je brief aan het schrijven...";

    try {
      const response = await fetch(`${BACKEND_URL}/ai/motivation-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      letterError.textContent =
        "Kon geen contact maken met de server. Controleer de URL of probeer later opnieuw.";
      letterError.classList.remove("hidden");
      console.error(err);
    } finally {
      letterBtn.disabled = false;
      letterBtn.textContent = "Schrijf mijn motivatiebrief met AI";
    }
  });
}

// --- Matchscore ---
if (matchBtn) {
  matchBtn.addEventListener("click", async () => {
    let cvText = (matchCvInput?.value || "").trim();
    const jobText = (matchJobInput?.value || "").trim();

    matchError.classList.add("hidden");
    matchResultBox.classList.add("hidden");
    matchResult.textContent = "";

    if (!cvText && lastRewrittenCvText) {
      cvText = lastRewrittenCvText;
      if (matchCvInput) {
        matchCvInput.value = lastRewrittenCvText;
      }
    }

    if (!cvText) {
      matchError.textContent =
        "Vul eerst je CV-tekst in (of laat AI eerst je CV herschrijven).";
      matchError.classList.remove("hidden");
      return;
    }

    if (!jobText) {
      matchError.textContent =
        "Vul eerst de vacaturetekst in (of kies een vacature via de vacatures-pagina).";
      matchError.classList.remove("hidden");
      return;
    }

    matchBtn.disabled = true;
    matchBtn.textContent = "AI berekent match...";

    try {
      const response = await fetch(`${BACKEND_URL}/ai/match-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        matchResult.textContent = `Score: ${data.match_score}/100\n\nUitleg:\n${
          data.explanation || "Geen uitleg ontvangen."
        }`;
        matchResultBox.classList.remove("hidden");
      }
    } catch (err) {
      matchError.textContent =
        "Kon geen contact maken met de server. Controleer de URL of probeer later opnieuw.";
      matchError.classList.remove("hidden");
      console.error("Matchscore error:", err);
    } finally {
      matchBtn.disabled = false;
      matchBtn.textContent = "Bereken matchscore";
    }
  });
}

// ------------------ WERKGEVER: ACCOUNT / VACATURE / DASHBOARD ------------------

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

const jobTitleInput = document.getElementById("jobTitleInput");
const jobLocationInput = document.getElementById("jobLocationInput");
const jobSalaryInput = document.getElementById("jobSalaryInput");
const jobDescriptionInputEmp = document.getElementById("jobDescriptionInputEmp");
const jobSubmitBtn = document.getElementById("jobSubmitBtn");
const jobResultBox = document.getElementById("jobResultBox");
const jobResult = document.getElementById("jobResult");
const jobError = document.getElementById("jobError");

const employerLoadJobsBtn = document.getElementById("employerLoadJobsBtn");
const employerJobSelect = document.getElementById("employerJobSelect");
const employerLoadCandidatesBtn = document.getElementById("employerLoadCandidatesBtn");
const employerAIRankBtn = document.getElementById("employerAIRankBtn");
const employerDashboardError = document.getElementById("employerDashboardError");
const employerCandidatesBox = document.getElementById("employerCandidatesBox");
const employerCandidates = document.getElementById("employerCandidates");
const employerAIRankBox = document.getElementById("employerAIRankBox");
const employerAIRank = document.getElementById("employerAIRank");

const COMPANY_ID_STORAGE_KEY = "its_peanuts_company_id";

function saveCompanyId(id) {
  try {
    localStorage.setItem(COMPANY_ID_STORAGE_KEY, String(id));
  } catch (e) {
    console.warn("Kon company_id niet opslaan in localStorage:", e);
  }
}

function getCompanyId() {
  try {
    const raw = localStorage.getItem(COMPANY_ID_STORAGE_KEY);
    if (!raw) return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
  } catch (e) {
    console.warn("Kon company_id niet lezen uit localStorage:", e);
    return null;
  }
}

// Werkgever: account aanmaken
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
        headers: { "Content-Type": "application/json" },
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

        saveCompanyId(data.id);

        empResult.textContent =
          `Bedrijf-ID: ${data.id}\n` +
          `Bedrijfsnaam: ${data.name}\n` +
          `E-mail: ${data.contact_email}\n` +
          `Abonnement: ${data.billing_plan}\n` +
          `Trial vacatures gebruikt: ${data.trial_jobs_used}`;
        empResultBox.classList.remove("hidden");
      }
    } catch (err) {
      empError.textContent =
        "Kon geen contact maken met de server. Controleer de URL of probeer later opnieuw.";
      empError.classList.remove("hidden");
      console.error(err);
    } finally {
      empSubmitBtn.disabled = false;
      empSubmitBtn.textContent = "Maak mijn gratis trial-account aan";
    }
  });
}

// Werkgever: vacature aanmaken
if (jobSubmitBtn) {
  jobSubmitBtn.addEventListener("click", async () => {
    const title = (jobTitleInput?.value || "").trim();
    const location = (jobLocationInput?.value || "").trim();
    const salary = (jobSalaryInput?.value || "").trim();
    const description = (jobDescriptionInputEmp?.value || "").trim();

    jobError.classList.add("hidden");
    jobResultBox.classList.add("hidden");
    jobResult.textContent = "";

    if (!title || !description) {
      jobError.textContent = "Vul minimaal functietitel en vacaturetekst in.";
      jobError.classList.remove("hidden");
      return;
    }

    const companyId = getCompanyId();
    if (!companyId) {
      jobError.textContent = "Geen bedrijf gevonden. Maak eerst een trial-account aan (Stap 1).";
      jobError.classList.remove("hidden");
      return;
    }

    jobSubmitBtn.disabled = true;
    jobSubmitBtn.textContent = "Vacature wordt aangemaakt...";

    try {
      const response = await fetch(`${BACKEND_URL}/ats/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          title,
          description,
          location: location || null,
          salary_range: salary || null
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        jobError.textContent = `Er ging iets mis (${response.status}): ${errorText}`;
        jobError.classList.remove("hidden");
      } else {
        const data = await response.json();
        jobResult.textContent =
          `Vacature-ID: ${data.id}\n` +
          `Titel: ${data.title}\n` +
          `Status: ${data.status}\n` +
          `Is trial-vacature: ${data.is_trial ? "JA" : "NEE"}\n` +
          `Company ID: ${data.company_id}`;
        jobResultBox.classList.remove("hidden");
      }
    } catch (err) {
      jobError.textContent =
        "Kon geen contact maken met de server. Controleer de URL of probeer later opnieuw.";
      jobError.classList.remove("hidden");
      console.error(err);
    } finally {
      jobSubmitBtn.disabled = false;
      jobSubmitBtn.textContent = "Plaats mijn eerste vacature";
    }
  });
}

// Werkgever: vacatures laden
if (employerLoadJobsBtn) {
  employerLoadJobsBtn.addEventListener("click", async () => {
    employerDashboardError.classList.add("hidden");
    employerCandidatesBox.classList.add("hidden");
    employerAIRankBox.classList.add("hidden");
    employerCandidates.textContent = "";
    employerAIRank.textContent = "";

    const companyId = getCompanyId();
    if (!companyId) {
      employerDashboardError.textContent =
        "Geen bedrijf gevonden. Maak eerst een trial-account aan in stap 1.";
      employerDashboardError.classList.remove("hidden");
      return;
    }

    employerLoadJobsBtn.disabled = true;
    employerLoadJobsBtn.textContent = "Vacatures worden geladen...";

    try {
      const response = await fetch(`${BACKEND_URL}/ats/companies/${companyId}/jobs`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        const errorText = await response.text();
        employerDashboardError.textContent =
          `Er ging iets mis bij het laden van vacatures (${response.status}): ${errorText}`;
        employerDashboardError.classList.remove("hidden");
      } else {
        const jobs = await response.json();

        employerJobSelect.innerHTML = "";

        if (!jobs.length) {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "Dit bedrijf heeft nog geen vacatures.";
          employerJobSelect.appendChild(option);
        } else {
          const placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = "Kies een vacature...";
          employerJobSelect.appendChild(placeholder);

          jobs.forEach((job) => {
            const option = document.createElement("option");
            option.value = job.id;
            option.textContent = `${job.id} – ${job.title} (${job.status})`;
            employerJobSelect.appendChild(option);
          });
        }
      }
    } catch (err) {
      employerDashboardError.textContent =
        "Kon geen contact maken met de server bij het laden van vacatures.";
      employerDashboardError.classList.remove("hidden");
      console.error(err);
    } finally {
      employerLoadJobsBtn.disabled = false;
      employerLoadJobsBtn.textContent = "Laad mijn vacatures";
    }
  });
}

// Werkgever: kandidaten laden
if (employerLoadCandidatesBtn) {
  employerLoadCandidatesBtn.addEventListener("click", async () => {
    employerDashboardError.classList.add("hidden");
    employerCandidatesBox.classList.add("hidden");
    employerAIRankBox.classList.add("hidden");
    employerCandidates.textContent = "";
    employerAIRank.textContent = "";

    const selectedJobId = employerJobSelect?.value || "";
    if (!selectedJobId) {
      employerDashboardError.textContent = "Kies eerst een vacature.";
      employerDashboardError.classList.remove("hidden");
      return;
    }

    employerLoadCandidatesBtn.disabled = true;
    employerLoadCandidatesBtn.textContent = "Kandidaten worden geladen...";

    try {
      const response = await fetch(`${BACKEND_URL}/ats/jobs/${selectedJobId}/candidates`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        const errorText = await response.text();
        employerDashboardError.textContent =
          `Er ging iets mis bij het laden van kandidaten (${response.status}): ${errorText}`;
        employerDashboardError.classList.remove("hidden");
      } else {
        const candidates = await response.json();

        if (!candidates.length) {
          employerCandidates.textContent = "Er zijn nog geen kandidaten voor deze vacature.";
        } else {
          const lines = candidates.map((c) => {
            const name = c.full_name || "(Naam onbekend)";
            const email = c.email || "-";
            const score =
              typeof c.match_score === "number" ? `${c.match_score}/100` : "nog niet gescoord";
            return `#${c.id} – ${name} – ${email} – matchscore: ${score}`;
          });

          employerCandidates.textContent = lines.join("\n");
        }

        employerCandidatesBox.classList.remove("hidden");
      }
    } catch (err) {
      employerDashboardError.textContent =
        "Kon geen contact maken met de server bij het laden van kandidaten.";
      employerDashboardError.classList.remove("hidden");
      console.error(err);
    } finally {
      employerLoadCandidatesBtn.disabled = false;
      employerLoadCandidatesBtn.textContent = "Laad kandidaten";
    }
  });
}

// Werkgever: AI-ranking
if (employerAIRankBtn) {
  employerAIRankBtn.addEventListener("click", async () => {
    employerDashboardError.classList.add("hidden");
    employerAIRankBox.classList.add("hidden");
    employerAIRank.textContent = "";

    const selectedJobId = employerJobSelect?.value || "";
    if (!selectedJobId) {
      employerDashboardError.textContent = "Kies eerst een vacature.";
      employerDashboardError.classList.remove("hidden");
      return;
    }

    employerAIRankBtn.disabled = true;
    employerAIRankBtn.textContent = "AI is kandidaten aan het rangschikken...";

    try {
      const response = await fetch(
        `${BACKEND_URL}/ats/jobs/${selectedJobId}/ai-rank-internal`,
        {
          method: "POST",
          headers: { Accept: "application/json" }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        employerDashboardError.textContent =
          `Er ging iets mis bij AI-ranking (${response.status}): ${errorText}`;
        employerDashboardError.classList.remove("hidden");
      } else {
        const ranked = await response.json();

        if (!ranked.length) {
          employerAIRank.textContent =
            "AI kon geen ranking maken of er zijn geen kandidaten voor deze vacature.";
        } else {
          const lines = ranked.map((item, index) => {
            const name = item.full_name || "(Naam onbekend)";
            const email = item.email || "-";
            return (
              `#${index + 1}: ${name} – ${email}\n` +
              `Score: ${item.match_score}/100\n` +
              `Uitleg: ${item.explanation}\n` +
              "----------------------------------------"
            );
          });

          employerAIRank.textContent = lines.join("\n\n");
        }

        employerAIRankBox.classList.remove("hidden");
      }
    } catch (err) {
      employerDashboardError.textContent =
        "Kon geen contact maken met de server voor AI-ranking.";
      employerDashboardError.classList.remove("hidden");
      console.error(err);
    } finally {
      employerAIRankBtn.disabled = false;
      employerAIRankBtn.textContent = "Laat AI sorteren";
    }
  });
}





