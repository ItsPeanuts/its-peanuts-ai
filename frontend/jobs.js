// Zelfde backend als de rest
const BACKEND_URL = "https://its-peanuts-ai.onrender.com";

// Keys voor opslag
const SAVED_JOBS_KEY = "its_peanuts_saved_jobs";
const SELECTED_JOB_FOR_AI_KEY = "its_peanuts_selected_job_for_ai";

// Kleine helpers voor opgeslagen vacatures
function loadSavedJobIds() {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => Number(id)).filter((id) => !Number.isNaN(id));
  } catch (e) {
    console.warn("Kon saved_jobs niet lezen:", e);
    return [];
  }
}

function saveSavedJobIds(ids) {
  try {
    localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn("Kon saved_jobs niet opslaan:", e);
  }
}

let savedJobIds = loadSavedJobIds();
let allJobsCache = [];
let selectedDetailJobId = null;

// Elementen
const jobsCvInput = document.getElementById("jobsCvInput");
const jobSearchQuery = document.getElementById("jobSearchQuery");
const jobSearchLocation = document.getElementById("jobSearchLocation");
const jobBoardSearchBtn = document.getElementById("jobBoardSearchBtn");
const jobBoardAIButton = document.getElementById("jobBoardAIButton");
const jobBoardError = document.getElementById("jobBoardError");
const jobBoardList = document.getElementById("jobBoardList");
const jobBoardDetail = document.getElementById("jobBoardDetail");
const jobBoardDetailTitle = document.getElementById("jobBoardDetailTitle");
const jobBoardDetailMeta = document.getElementById("jobBoardDetailMeta");
const jobBoardDetailDescription = document.getElementById("jobBoardDetailDescription");
const jobBoardUseForAI = document.getElementById("jobBoardUseForAI");
const jobBoardSaveBtn = document.getElementById("jobBoardSaveBtn");
const jobBoardDetailInfo = document.getElementById("jobBoardDetailInfo");

// ------------ Vacature-lijst renderen ------------

function toggleSaveJob(jobId) {
  if (savedJobIds.includes(jobId)) {
    savedJobIds = savedJobIds.filter((id) => id !== jobId);
  } else {
    savedJobIds.push(jobId);
  }
  saveSavedJobIds(savedJobIds);
}

function showJobDetail(jobId) {
  const job = allJobsCache.find((j) => j.id === jobId);
  if (!job || !jobBoardDetail) return;

  selectedDetailJobId = job.id;

  const companyName = job.company_name || `Bedrijf #${job.company_id}`;
  const location = job.location || "Locatie onbekend";
  const salary = job.salary_range || "";

  jobBoardDetailTitle.textContent = job.title;
  jobBoardDetailMeta.textContent =
    `${companyName} – ${location}${salary ? " – " + salary : ""}`;
  jobBoardDetailDescription.textContent = job.description || "(Geen vacaturetekst ingevuld)";

  const isSaved = savedJobIds.includes(job.id);
  jobBoardSaveBtn.textContent = isSaved ? "Verwijder uit opgeslagen" : "Sla vacature op";

  jobBoardDetailInfo.textContent =
    "Klik op 'Solliciteer met AI' om met deze vacature naar de AI-sollicitatiepagina te gaan.";

  jobBoardDetail.classList.remove("hidden");
}

function useJobForAI(job) {
  const companyName = job.company_name || `Bedrijf #${job.company_id}`;
  const description = job.description || "";

  try {
    localStorage.setItem(
      SELECTED_JOB_FOR_AI_KEY,
      JSON.stringify({
        title: job.title,
        description,
        company_name: companyName
      })
    );
  } catch (e) {
    console.warn("Kon geselecteerde job niet in localStorage zetten:", e);
  }

  // Terug naar hoofd- (kandidaat)pagina
  window.location.href = "index.html";
}

function renderJobBoardList(showScores = false) {
  if (!jobBoardList) return;

  jobBoardList.innerHTML = "";

  if (!allJobsCache.length) {
    const p = document.createElement("p");
    p.textContent = "Geen vacatures gevonden voor deze zoekopdracht.";
    p.style.color = "#9ca3af";
    jobBoardList.appendChild(p);
    return;
  }

  const container = document.createElement("div");

  allJobsCache.forEach((job) => {
    const item = document.createElement("div");
    item.style.borderTop = "1px solid #e5e7eb";
    item.style.padding = "8px 0";
    item.style.cursor = "pointer";

    const title = document.createElement("div");
    title.style.fontWeight = "600";
    title.textContent = job.title;
    item.appendChild(title);

    const meta = document.createElement("div");
    meta.style.fontSize = "13px";
    meta.style.color = "#6b7280";
    const companyName = job.company_name || `Bedrijf #${job.company_id}`;
    const location = job.location || "Locatie onbekend";
    const salary = job.salary_range || "";
    meta.textContent = `${companyName} – ${location}${salary ? " – " + salary : ""}`;
    item.appendChild(meta);

    if (showScores && typeof job._matchScore === "number") {
      const scoreLine = document.createElement("div");
      scoreLine.style.fontSize = "13px";
      scoreLine.style.color = "#16a34a";
      scoreLine.textContent = `AI-matchscore: ${job._matchScore}/100`;
      item.appendChild(scoreLine);
    }

    const snippet = document.createElement("div");
    snippet.style.fontSize = "13px";
    snippet.style.color = "#4b5563";
    const text = job.description || "";
    const shortText = text.length > 180 ? text.slice(0, 180) + "..." : text;
    snippet.textContent = shortText;
    item.appendChild(snippet);

    const buttonRow = document.createElement("div");
    buttonRow.style.marginTop = "6px";
    buttonRow.style.display = "flex";
    buttonRow.style.flexWrap = "wrap";
    buttonRow.style.gap = "6px";

    const readBtn = document.createElement("button");
    readBtn.textContent = "Lees vacature";
    readBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showJobDetail(job.id);
    });
    buttonRow.appendChild(readBtn);

    const applyBtn = document.createElement("button");
    applyBtn.textContent = "Solliciteer met AI";
    applyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      useJobForAI(job);
    });
    buttonRow.appendChild(applyBtn);

    const saveBtn = document.createElement("button");
    const isSaved = savedJobIds.includes(job.id);
    saveBtn.textContent = isSaved ? "Verwijder uit opgeslagen" : "Sla vacature op";
    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSaveJob(job.id);
      const nowSaved = savedJobIds.includes(job.id);
      saveBtn.textContent = nowSaved ? "Verwijder uit opgeslagen" : "Sla vacature op";
    });
    buttonRow.appendChild(saveBtn);

    item.addEventListener("click", () => {
      showJobDetail(job.id);
    });

    item.appendChild(buttonRow);
    container.appendChild(item);
  });

  jobBoardList.appendChild(container);
}

// ------------ Vacatures ophalen (zoeken) ------------

if (jobBoardSearchBtn) {
  jobBoardSearchBtn.addEventListener("click", async () => {
    if (jobBoardError) {
      jobBoardError.classList.add("hidden");
      jobBoardError.textContent = "";
    }
    if (jobBoardDetail) {
      jobBoardDetail.classList.add("hidden");
    }

    const q = (jobSearchQuery?.value || "").trim().toLowerCase();
    const loc = (jobSearchLocation?.value || "").trim().toLowerCase();

    if (jobBoardList) {
      jobBoardList.innerHTML = "<p>Zoekresultaten worden geladen...</p>";
    }

    jobBoardSearchBtn.disabled = true;
    jobBoardSearchBtn.textContent = "Zoekresultaten worden geladen...";

    try {
      const response = await fetch(`${BACKEND_URL}/ats/jobs`, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (jobBoardError) {
          jobBoardError.textContent =
            `Er ging iets mis bij het laden van vacatures (${response.status}): ${errorText}`;
          jobBoardError.classList.remove("hidden");
        }
        if (jobBoardList) {
          jobBoardList.innerHTML = "<p>Kon vacatures niet laden.</p>";
        }
      } else {
        const jobs = await response.json();

        // Client-side filteren
        allJobsCache = jobs.filter((job) => {
          const title = (job.title || "").toLowerCase();
          const location = (job.location || "").toLowerCase();
          const desc = (job.description || "").toLowerCase();

          const matchesQ =
            !q || title.includes(q) || location.includes(q) || desc.includes(q);

          const matchesLoc = !loc || location.includes(loc);

          return matchesQ && matchesLoc;
        });

        // oude scores weghalen
        allJobsCache.forEach((job) => {
          delete job._matchScore;
          delete job._matchExplanation;
        });

        renderJobBoardList(false);
      }
    } catch (err) {
      console.error("Fout bij laden vacatures (jobboard search):", err);
      if (jobBoardError) {
        jobBoardError.textContent =
          "Kon geen contact maken met de server bij het zoeken naar vacatures.";
        jobBoardError.classList.remove("hidden");
      }
      if (jobBoardList) {
        jobBoardList.innerHTML = "<p>Kon vacatures niet laden.</p>";
      }
    } finally {
      jobBoardSearchBtn.disabled = false;
      jobBoardSearchBtn.textContent = "Zoek vacatures";
    }
  });
}

// ------------ AI: sorteren op beste match ------------

if (jobBoardAIButton) {
  jobBoardAIButton.addEventListener("click", async () => {
    if (jobBoardError) {
      jobBoardError.classList.add("hidden");
      jobBoardError.textContent = "";
    }

    if (!allJobsCache.length) {
      if (jobBoardError) {
        jobBoardError.textContent =
          "Zoek eerst vacatures met de zoekbalk. Daarna kan AI ze beoordelen op basis van jouw CV.";
        jobBoardError.classList.remove("hidden");
      }
      return;
    }

    const cvText = (jobsCvInput?.value || "").trim();
    if (!cvText) {
      if (jobBoardError) {
        jobBoardError.textContent =
          "Plak eerst je CV-tekst hierboven, dan kan AI vacatures matchen op basis van jouw profiel.";
        jobBoardError.classList.remove("hidden");
      }
      return;
    }

    jobBoardAIButton.disabled = true;
    jobBoardAIButton.textContent = "AI is vacatures aan het beoordelen...";

    try {
      let anyScored = false;

      for (let job of allJobsCache) {
        const description = job.description || "";
        if (!description) continue;

        try {
          const response = await fetch(`${BACKEND_URL}/ai/match-job`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidate_profile_text: cvText,
              job_description: description
            })
          });

          if (!response.ok) {
            console.warn("AI-match-job fout voor job", job.id, response.status);
            continue;
          }

          const data = await response.json();
          job._matchScore = data.match_score ?? null;
          job._matchExplanation = data.explanation ?? null;
          anyScored = true;
        } catch (err) {
          console.error("Fout bij AI-match-job voor job", job.id, err);
        }
      }

      if (!anyScored) {
        if (jobBoardError) {
          jobBoardError.textContent =
            "AI kon geen scores berekenen. Probeer het later opnieuw of controleer je CV.";
          jobBoardError.classList.remove("hidden");
        }
      } else {
        allJobsCache.sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));
        renderJobBoardList(true);

        if (jobBoardError) {
          jobBoardError.textContent =
            "AI heeft vacatures gesorteerd op beste match op basis van jouw CV.";
          jobBoardError.classList.remove("hidden");
        }
      }
    } catch (err) {
      console.error("Fout bij AI-ranking van vacatures:", err);
      if (jobBoardError) {
        jobBoardError.textContent =
          "Kon geen contact maken met de server voor AI-matching.";
        jobBoardError.classList.remove("hidden");
      }
    } finally {
      jobBoardAIButton.disabled = false;
      jobBoardAIButton.textContent = "AI: sorteer op beste match met mijn CV";
    }
  });
}

// Detail-knoppen
if (jobBoardUseForAI) {
  jobBoardUseForAI.addEventListener("click", () => {
    if (!selectedDetailJobId) return;
    const job = allJobsCache.find((j) => j.id === selectedDetailJobId);
    if (!job) return;
    useJobForAI(job);
  });
}

if (jobBoardSaveBtn) {
  jobBoardSaveBtn.addEventListener("click", () => {
    if (!selectedDetailJobId) return;
    toggleSaveJob(selectedDetailJobId);
    const isSaved = savedJobIds.includes(selectedDetailJobId);
    jobBoardSaveBtn.textContent = isSaved
      ? "Verwijder uit opgeslagen"
      : "Sla vacature op";
  });
}
