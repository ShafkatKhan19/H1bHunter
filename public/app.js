/**
 * H1BHunter Frontend App - Fixed & Fully Functional
 */

const API_BASE = '/api';
let currentUser = null;
let currentCompanies = [];
let isLoginMode = true;

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  loadStats();
  setupEventListeners();
  loadAllCompanies();
});

function initApp() {
  const token = localStorage.getItem('h1b_token');
  if (token) {
    try {
      currentUser = JSON.parse(localStorage.getItem('h1b_user'));
      updateAuthUI();
    } catch(e) {
      localStorage.removeItem('h1b_token');
      localStorage.removeItem('h1b_user');
    }
  }
}

function setupEventListeners() {
  document.getElementById('searchBtn')?.addEventListener('click', searchCompanies);
  document.getElementById('fieldInput')?.addEventListener('keypress', (e) => e.key === 'Enter' && searchCompanies());
  document.getElementById('locationInput')?.addEventListener('keypress', (e) => e.key === 'Enter' && searchCompanies());
  document.getElementById('authBtn')?.addEventListener('click', toggleAuthModal);
  document.getElementById('authForm')?.addEventListener('submit', handleAuth);

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('authModal')?.classList.remove('active');
      document.getElementById('companyModal')?.classList.remove('active');
    });
  });

  document.getElementById('authModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'authModal') e.target.classList.remove('active');
  });
  document.getElementById('companyModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'companyModal') e.target.classList.remove('active');
  });

  document.getElementById('navHome')?.addEventListener('click', (e) => { e.preventDefault(); showHome(); });
  document.getElementById('navSearch')?.addEventListener('click', (e) => { e.preventDefault(); showSearch(); });
  document.getElementById('navOptguard')?.addEventListener('click', (e) => { e.preventDefault(); showOptguard(); });

  const toggleLink = document.querySelector('.toggle-auth a');
  if (toggleLink) {
    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      document.getElementById('authTitle').textContent = isLoginMode ? 'Login' : 'Create Account';
      document.querySelector('#authForm button[type="submit"]').textContent = isLoginMode ? 'Login' : 'Sign Up';
      document.querySelector('.toggle-auth').innerHTML = isLoginMode
        ? "Don't have an account? <a href='#'>Sign up</a>"
        : "Already have an account? <a href='#'>Login</a>";
    });
  }
}

// ─── STATS ───────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();
    const el = document.getElementById('companyCount');
    if (el) el.textContent = data.totalCompanies?.toLocaleString() || '51';
  } catch (err) {
    const el = document.getElementById('companyCount');
    if (el) el.textContent = '51';
  }
}

// ─── LOAD ALL COMPANIES ───────────────────────────────────────
async function loadAllCompanies() {
  try {
    const res = await fetch(`${API_BASE}/companies/search?limit=51`);
    const data = await res.json();
    currentCompanies = data.companies || [];
    const resultsSection = document.getElementById('resultsSection');
    const heroSection = document.getElementById('heroSection');
    displayCompanies(currentCompanies);
    if (resultsSection) resultsSection.classList.remove('hidden');
    if (heroSection) heroSection.style.display = 'none';
    const heading = resultsSection?.querySelector('h2');
    if (heading) heading.textContent = `${data.total} H-1B Sponsoring Companies`;
  } catch(e) {
    console.error('Failed to load companies:', e);
  }
}

// ─── SEARCH ──────────────────────────────────────────────────
async function searchCompanies() {
  const field = document.getElementById('fieldInput')?.value.trim();
  const location = document.getElementById('locationInput')?.value.trim();
  const searchBtn = document.getElementById('searchBtn');
  const resultsSection = document.getElementById('resultsSection');
  const heroSection = document.getElementById('heroSection');

  try {
    if (searchBtn) { searchBtn.disabled = true; searchBtn.textContent = 'Searching...'; }

    const params = new URLSearchParams();
    if (field) params.append('field', field);
    if (location) params.append('location', location);
    params.append('limit', 51);

    const res = await fetch(`${API_BASE}/companies/search?${params}`);
    const data = await res.json();
    currentCompanies = data.companies || [];

    const heading = resultsSection?.querySelector('h2');
    if (heading) {
      heading.textContent = field
        ? `${data.total} Companies Sponsoring H-1B in "${field}"`
        : `${data.total} H-1B Sponsoring Companies`;
    }

    displayCompanies(currentCompanies);
    if (resultsSection) resultsSection.classList.remove('hidden');
    if (heroSection) heroSection.style.display = 'none';
    setTimeout(() => resultsSection?.scrollIntoView({ behavior: 'smooth' }), 100);

  } catch (err) {
    showToast('Search failed. Please try again.', 'error');
  } finally {
    if (searchBtn) { searchBtn.disabled = false; searchBtn.textContent = 'Search Companies'; }
  }
}

// ─── DISPLAY COMPANIES ───────────────────────────────────────
function displayCompanies(companies) {
  const grid = document.getElementById('companyGrid');
  if (!grid) return;

  if (!companies || companies.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#888">
        <p style="font-size:1.5rem;margin-bottom:1rem">No companies found</p>
        <p>Try: Technology, Finance, Healthcare, IT Consulting, Pharma, Aerospace</p>
        <button onclick="document.getElementById('fieldInput').value='';loadAllCompanies()"
          style="margin-top:1rem;padding:0.75rem 1.5rem;background:#00d4ff;color:#000;
                 border:none;border-radius:8px;cursor:pointer;font-weight:600">
          Show All Companies
        </button>
      </div>`;
    return;
  }

  grid.innerHTML = companies.map(c => `
    <div class="company-card" onclick="viewCompanyDetails('${c.id}')" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.5rem">
        <h3 style="font-size:1.1rem;font-weight:700;margin:0">${escapeHtml(c.name)}</h3>
        <span style="background:${c.trust_score>=9?'#22c55e':c.trust_score>=7?'#3b82f6':'#f59e0b'};
                     color:#fff;padding:0.2rem 0.5rem;border-radius:12px;font-size:0.75rem;font-weight:700;white-space:nowrap">
          ${c.trust_score}/10
        </span>
      </div>
      <p style="color:#00d4ff;font-size:0.85rem;margin-bottom:0.75rem">${escapeHtml(c.industry || 'N/A')}</p>
      
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-bottom:0.75rem">
        <div style="text-align:center;background:rgba(255,255,255,0.05);padding:0.5rem;border-radius:6px">
          <div style="font-weight:700;font-size:0.9rem">${(c.h1b_petitions_filed||0).toLocaleString()}</div>
          <div style="font-size:0.65rem;color:#888">H-1B Petitions</div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,0.05);padding:0.5rem;border-radius:6px">
          <div style="font-weight:700;font-size:0.9rem;color:#22c55e">${c.approval_rate?.toFixed(0)||'N/A'}%</div>
          <div style="font-size:0.65rem;color:#888">Approval Rate</div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,0.05);padding:0.5rem;border-radius:6px">
          <div style="font-weight:700;font-size:0.9rem">${c.average_salary?'$'+(c.average_salary/1000).toFixed(0)+'k':'N/A'}</div>
          <div style="font-size:0.65rem;color:#888">Avg Salary</div>
        </div>
      </div>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <span style="background:${c.sponsors_green_cards?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.1)'};
                     color:${c.sponsors_green_cards?'#22c55e':'#888'};
                     padding:0.2rem 0.6rem;border-radius:12px;font-size:0.75rem">
          ${c.sponsors_green_cards?'✅ Green Card':'H-1B Only'}
        </span>
        ${c.wage_level?`<span style="background:rgba(0,212,255,0.1);color:#00d4ff;
                               padding:0.2rem 0.6rem;border-radius:12px;font-size:0.75rem">
          ${c.wage_level}</span>`:''}
      </div>

      ${currentUser ? `
        <button onclick="saveCompany('${c.id}',event)"
          style="margin-top:0.75rem;width:100%;padding:0.4rem;background:rgba(255,255,255,0.1);
                 border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#fff;
                 cursor:pointer;font-size:0.8rem">
          ⭐ Save Company
        </button>` : ''}
    </div>
  `).join('');
}

// ─── COMPANY DETAILS MODAL ───────────────────────────────────
async function viewCompanyDetails(companyId) {
  const companyModal = document.getElementById('companyModal');
  const companyDetails = document.getElementById('companyDetails');
  if (!companyModal || !companyDetails) return;

  try {
    const res = await fetch(`${API_BASE}/companies/${companyId}`);
    const c = await res.json();

    const jobsHtml = c.recentJobs?.length > 0
      ? c.recentJobs.map(j => `
          <div style="padding:1rem;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:0.5rem">
            <h5 style="margin:0 0 0.25rem">${escapeHtml(j.title)}</h5>
            <p style="margin:0;color:#888;font-size:0.85rem">${escapeHtml(j.location||'')}
              ${j.salary_min?'| $'+j.salary_min.toLocaleString():''}</p>
            ${j.apply_url?`<a href="${j.apply_url}" target="_blank"
              style="display:inline-block;margin-top:0.5rem;padding:0.3rem 0.75rem;
                     background:#00d4ff;color:#000;border-radius:6px;font-size:0.8rem;
                     text-decoration:none;font-weight:600">
              Apply on ${j.job_board}</a>`:''}
          </div>`).join('')
      : `<p style="color:#888">No scraped listings yet.</p>
         <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
           <a href="https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(c.name+' visa sponsorship')}"
              target="_blank"
              style="padding:0.5rem 1rem;background:#0077b5;color:#fff;border-radius:6px;
                     text-decoration:none;font-size:0.85rem;font-weight:600">
             LinkedIn Jobs
           </a>
           <a href="https://www.indeed.com/jobs?q=${encodeURIComponent(c.name+' h1b sponsor')}"
              target="_blank"
              style="padding:0.5rem 1rem;background:#003a9b;color:#fff;border-radius:6px;
                     text-decoration:none;font-size:0.85rem;font-weight:600">
             Indeed Jobs
           </a>
           <a href="https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(c.name)}"
              target="_blank"
              style="padding:0.5rem 1rem;background:#0caa41;color:#fff;border-radius:6px;
                     text-decoration:none;font-size:0.85rem;font-weight:600">
             Glassdoor
           </a>
         </div>`;

    companyDetails.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1.5rem">
        <h2 style="margin:0;font-size:1.8rem">${escapeHtml(c.name)}</h2>
        <span style="background:${c.trust_score>=9?'#22c55e':'#3b82f6'};color:#fff;
                     padding:0.4rem 0.8rem;border-radius:20px;font-weight:700;font-size:1rem">
          Trust: ${c.trust_score}/10
        </span>
      </div>
      <p style="color:#00d4ff;font-size:1rem;margin-bottom:1.5rem">${escapeHtml(c.industry||'')}</p>

      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;margin-bottom:1.5rem">
        ${[
          ['H-1B Petitions Filed', (c.h1b_petitions_filed||0).toLocaleString(), '#00d4ff'],
          ['Approval Rate', (c.approval_rate?.toFixed(1)||'N/A')+'%', '#22c55e'],
          ['Denial Rate', (c.denial_rate?.toFixed(1)||'N/A')+'%', '#ef4444'],
          ['Average Salary', c.average_salary?'$'+c.average_salary.toLocaleString():'N/A', '#fff'],
          ['Wage Level', c.wage_level||'N/A', '#f59e0b'],
          ['Green Card Sponsor', c.sponsors_green_cards?'✅ Yes':'⚠️ No', c.sponsors_green_cards?'#22c55e':'#888'],
        ].map(([label, val, color]) => `
          <div style="background:rgba(255,255,255,0.05);padding:1rem;border-radius:8px">
            <div style="color:#888;font-size:0.8rem;margin-bottom:0.25rem">${label}</div>
            <div style="font-weight:700;font-size:1.1rem;color:${color}">${val}</div>
          </div>`).join('')}
      </div>

      <h3 style="margin-bottom:0.75rem">💼 Find Jobs at ${escapeHtml(c.name)}</h3>
      ${jobsHtml}

      ${currentUser?`
        <button onclick="saveCompany('${c.id}',event)"
          style="margin-top:1.5rem;width:100%;padding:0.75rem;background:#00d4ff;color:#000;
                 border:none;border-radius:8px;font-weight:700;font-size:1rem;cursor:pointer">
          ⭐ Save This Company
        </button>`:`
        <p style="text-align:center;margin-top:1.5rem;color:#888">
          <a href="#" onclick="toggleAuthModal()" style="color:#00d4ff">Login</a> to save companies & set alerts
        </p>`}
    `;

    companyModal.classList.add('active');
  } catch (err) {
    showToast('Failed to load company details', 'error');
  }
}

// ─── SAVE COMPANY ────────────────────────────────────────────
async function saveCompany(companyId, event) {
  event.stopPropagation();
  if (!currentUser) { toggleAuthModal(); return; }
  try {
    const res = await fetch(`${API_BASE}/companies/${companyId}/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('h1b_token')}`,
        'X-User-Id': currentUser.userId || currentUser.id
      }
    });
    if (res.ok) {
      event.target.textContent = '✅ Saved!';
      event.target.style.background = '#22c55e';
      event.target.disabled = true;
      showToast('Company saved! ✅', 'success');
    }
  } catch(e) {}
}

// ─── AUTH ────────────────────────────────────────────────────
function toggleAuthModal() {
  document.getElementById('authModal')?.classList.toggle('active');
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('emailInput')?.value.trim();
  const password = document.getElementById('passwordInput')?.value.trim();
  if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }

  const btn = document.querySelector('#authForm button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Please wait...'; }

  try {
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) { showToast(data.error || 'Auth failed', 'error'); return; }

    if (data.token) {
      localStorage.setItem('h1b_token', data.token);
      localStorage.setItem('h1b_user', JSON.stringify(data));
      currentUser = data;
      updateAuthUI();
      document.getElementById('authModal')?.classList.remove('active');
      showToast(isLoginMode ? '👋 Welcome back!' : '🎉 Welcome to H1BHunter!', 'success');
      displayCompanies(currentCompanies); // re-render to show save buttons
    } else {
      showToast('Account created! Please login.', 'success');
      isLoginMode = true;
    }
  } catch(err) {
    showToast('Connection error. Try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = isLoginMode ? 'Login' : 'Sign Up'; }
  }
}

function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  if (currentUser) {
    btn.textContent = '👤 ' + (currentUser.email?.split('@')[0] || 'Me');
    btn.onclick = logout;
  } else {
    btn.textContent = 'Login';
    btn.onclick = toggleAuthModal;
  }
}

function logout() {
  localStorage.removeItem('h1b_token');
  localStorage.removeItem('h1b_user');
  currentUser = null;
  updateAuthUI();
  displayCompanies(currentCompanies);
  showToast('Logged out', 'info');
}

// ─── NAVIGATION ──────────────────────────────────────────────
function showHome() {
  const hero = document.getElementById('heroSection');
  const results = document.getElementById('resultsSection');
  const opt = document.getElementById('optguardSection');
  if (hero) hero.style.display = '';
  if (results) results.classList.add('hidden');
  if (opt) opt.classList.add('hidden');
}

function showSearch() {
  const hero = document.getElementById('heroSection');
  const results = document.getElementById('resultsSection');
  const opt = document.getElementById('optguardSection');
  if (hero) hero.style.display = 'none';
  if (results) results.classList.remove('hidden');
  if (opt) opt.classList.add('hidden');
  if (currentCompanies.length === 0) loadAllCompanies();
}

function showOptguard() {
  const hero = document.getElementById('heroSection');
  const results = document.getElementById('resultsSection');
  const opt = document.getElementById('optguardSection');
  if (hero) hero.style.display = 'none';
  if (results) results.classList.add('hidden');
  if (opt) opt.classList.remove('hidden');
}

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:2rem;right:2rem;z-index:9999;padding:1rem 1.5rem;
    border-radius:8px;font-weight:600;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.3);
    background:${type==='error'?'#ef4444':type==='success'?'#22c55e':'#3b82f6'};
    max-width:320px;word-break:break-word;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 3000);
  setTimeout(() => t.remove(), 3500);
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = String(text);
  return d.innerHTML;
}
