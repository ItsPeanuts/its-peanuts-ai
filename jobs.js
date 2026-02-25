// ============================================================
// JOBS PAGE - VACATURES EN MATCHING
// ============================================================

let allJobs = [];
let selectedJobId = null;

document.addEventListener('DOMContentLoaded', () => {
  loadJobs();
});

async function loadJobs() {
  try {
    const response = await fetch('/api/jobs');
    const data = await response.json();
    
    if (response.ok) {
      allJobs = data.jobs || [];
      displayJobs(allJobs);
      document.getElementById('jobsCount').textContent = `${allJobs.length} vacature(s) beschikbaar`;
    } else {
      showJobsError('Fout bij laden vacatures');
    }
  } catch (err) {
    showJobsError('Verbindingsfout');
  }
}

function displayJobs(jobs) {
  const container = document.getElementById('jobsList');
  
  if (jobs.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: #888;"><p>😞 Geen vacatures gevonden</p></div>';
    return;
  }

  container.innerHTML = jobs.map(job => `
    <div class="job-card" onclick="openJobDetail('${job.id}')">
      <div class="job-header">
        <div>
          <h3>${job.title}</h3>
          <p class="job-company">${job.company || 'Bedrijf'}</p>
        </div>
      </div>
      <div class="job-meta">
        <span class="job-meta-item">📍 ${job.location || 'Onbekend'}</span>
        <span class="job-meta-item">💰 ${job.salary || 'Niet vermeld'}</span>
      </div>
      <p class="job-description">${truncateText(job.description, 150)}</p>
      <div class="job-footer">
        <button class="btn btn-primary" onclick="openJobDetail('${job.id}'); event.stopPropagation();">Details</button>
      </div>
    </div>
  `).join('');
}

function openJobDetail(jobId) {
  selectedJobId = jobId;
  const job = allJobs.find(j => j.id === jobId);
  
  if (!job) return;

  const detail = document.getElementById('jobDetail');
  detail.innerHTML = `
    <h2>${job.title}</h2>
    <p class="job-company-large">${job.company || 'Bedrijf'}</p>
    <div class="job-detail-meta">
      <div class="meta-item">
        <span class="meta-label">📍 Locatie</span>
        <span>${job.location || 'Onbekend'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">💰 Salaris</span>
        <span>${job.salary || 'Niet vermeld'}</span>
      </div>
    </div>
    <div class="job-description-full">
      <h4>Vacaturebeschrijving</h4>
      <pre>${job.description}</pre>
    </div>
  `;

  document.getElementById('jobModal').classList.remove('hidden');
}

document.addEventListener('click', function(e) {
  if (e.target.id === 'closeModalBtn' || e.target.classList.contains('modal-close')) {
    document.getElementById('jobModal').classList.add('hidden');
  }
});

document.getElementById('applyBtn').addEventListener('click', () => {
  alert('Sollicitatie functie wordt nog gebouwd!');
});

document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('resetBtn').addEventListener('click', resetSearch);

function performSearch() {
  const keyword = document.getElementById('searchKeyword').value.toLowerCase();
  const location = document.getElementById('searchLocation').value.toLowerCase();

  const filtered = allJobs.filter(job => {
    const matchTitle = !keyword || job.title.toLowerCase().includes(keyword);
    const matchLocation = !location || (job.location && job.location.toLowerCase().includes(location));
    return matchTitle && matchLocation;
  });

  displayJobs(filtered);
}

function resetSearch() {
  document.getElementById('searchKeyword').value = '';
  document.getElementById('searchLocation').value = '';
  displayJobs(allJobs);
}

function truncateText(text, length) {
  return text.length > length ? text.substring(0, length) + '...' : text;
}

document.getElementById('jobModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('jobModal')) {
    document.getElementById('jobModal').classList.add('hidden');
  }
});
