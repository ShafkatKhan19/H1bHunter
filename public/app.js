/**
 * H1BHunter - Frontend App
 * Real job application URLs, working auth, clean UI
 */

const API = '/api';
let user = null;
let allCompanies = [];
let filtered = [];
let isLogin = true;

// Real careers / job search URLs for each company
const JOB_URLS = {
  'Amazon':                  { direct: 'https://www.amazon.jobs/en/search?base_query=h1b+sponsorship', li: 'https://www.linkedin.com/jobs/amazon-jobs', in: 'https://www.indeed.com/cmp/Amazon/jobs' },
  'Google':                  { direct: 'https://careers.google.com/jobs/results/', li: 'https://www.linkedin.com/jobs/google-jobs', in: 'https://www.indeed.com/cmp/Google/jobs' },
  'Microsoft':               { direct: 'https://careers.microsoft.com/us/en/search-results?keywords=software', li: 'https://www.linkedin.com/jobs/microsoft-jobs', in: 'https://www.indeed.com/cmp/Microsoft/jobs' },
  'Meta':                    { direct: 'https://www.metacareers.com/jobs', li: 'https://www.linkedin.com/jobs/meta-jobs', in: 'https://www.indeed.com/cmp/Meta/jobs' },
  'Apple':                   { direct: 'https://jobs.apple.com/en-us/search', li: 'https://www.linkedin.com/jobs/apple-jobs', in: 'https://www.indeed.com/cmp/Apple/jobs' },
  'Nvidia':                  { direct: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', li: 'https://www.linkedin.com/jobs/nvidia-jobs', in: 'https://www.indeed.com/cmp/NVIDIA/jobs' },
  'Netflix':                 { direct: 'https://jobs.netflix.com/search', li: 'https://www.linkedin.com/jobs/netflix-jobs', in: 'https://www.indeed.com/cmp/Netflix/jobs' },
  'Salesforce':              { direct: 'https://careers.salesforce.com/en/jobs/', li: 'https://www.linkedin.com/jobs/salesforce-jobs', in: 'https://www.indeed.com/cmp/Salesforce/jobs' },
  'Adobe':                   { direct: 'https://careers.adobe.com/us/en/search-results', li: 'https://www.linkedin.com/jobs/adobe-jobs', in: 'https://www.indeed.com/cmp/Adobe/jobs' },
  'Cisco':                   { direct: 'https://jobs.cisco.com/jobs/SearchJobs', li: 'https://www.linkedin.com/jobs/cisco-jobs', in: 'https://www.indeed.com/cmp/Cisco/jobs' },
  'Oracle':                  { direct: 'https://careers.oracle.com/jobs/#en/sites/jobsearch/requisitions', li: 'https://www.linkedin.com/jobs/oracle-jobs', in: 'https://www.indeed.com/cmp/Oracle/jobs' },
  'Intel':                   { direct: 'https://jobs.intel.com/en/search-jobs', li: 'https://www.linkedin.com/jobs/intel-jobs', in: 'https://www.indeed.com/cmp/Intel/jobs' },
  'Qualcomm':                { direct: 'https://careers.qualcomm.com/careers/search', li: 'https://www.linkedin.com/jobs/qualcomm-jobs', in: 'https://www.indeed.com/cmp/Qualcomm/jobs' },
  'AMD':                     { direct: 'https://careers.amd.com/careers/search', li: 'https://www.linkedin.com/jobs/amd-jobs', in: 'https://www.indeed.com/cmp/AMD/jobs' },
  'Broadcom':                { direct: 'https://careers.broadcom.com/careers/search', li: 'https://www.linkedin.com/jobs/broadcom-jobs', in: 'https://www.indeed.com/cmp/Broadcom/jobs' },
  'IBM':                     { direct: 'https://www.ibm.com/employment/', li: 'https://www.linkedin.com/jobs/ibm-jobs', in: 'https://www.indeed.com/cmp/IBM/jobs' },
  'Uber':                    { direct: 'https://www.uber.com/us/en/careers/list/', li: 'https://www.linkedin.com/jobs/uber-jobs', in: 'https://www.indeed.com/cmp/Uber/jobs' },
  'Airbnb':                  { direct: 'https://careers.airbnb.com/', li: 'https://www.linkedin.com/jobs/airbnb-jobs', in: 'https://www.indeed.com/cmp/Airbnb/jobs' },
  'Stripe':                  { direct: 'https://stripe.com/jobs/search', li: 'https://www.linkedin.com/jobs/stripe-jobs', in: 'https://www.indeed.com/cmp/Stripe/jobs' },
  'LinkedIn':                { direct: 'https://careers.linkedin.com/jobs', li: 'https://www.linkedin.com/jobs/linkedin-jobs', in: 'https://www.indeed.com/cmp/LinkedIn/jobs' },
  'Snowflake':               { direct: 'https://careers.snowflake.com/us/en/search-results', li: 'https://www.linkedin.com/jobs/snowflake-jobs', in: 'https://www.indeed.com/cmp/Snowflake/jobs' },
  'Databricks':              { direct: 'https://www.databricks.com/company/careers/open-positions', li: 'https://www.linkedin.com/jobs/databricks-jobs', in: 'https://www.indeed.com/cmp/Databricks/jobs' },
  'Palo Alto Networks':      { direct: 'https://jobs.paloaltonetworks.com/en/jobs/', li: 'https://www.linkedin.com/jobs/palo-alto-networks-jobs', in: 'https://www.indeed.com/cmp/Palo-Alto-Networks/jobs' },
  'CrowdStrike':             { direct: 'https://careers.crowdstrike.com/us/en/search-results', li: 'https://www.linkedin.com/jobs/crowdstrike-jobs', in: 'https://www.indeed.com/cmp/Crowdstrike/jobs' },
  'ServiceNow':              { direct: 'https://careers.servicenow.com/en/jobs/', li: 'https://www.linkedin.com/jobs/servicenow-jobs', in: 'https://www.indeed.com/cmp/ServiceNow/jobs' },
  'Workday':                 { direct: 'https://workday.wd5.myworkdayjobs.com/Workday', li: 'https://www.linkedin.com/jobs/workday-jobs', in: 'https://www.indeed.com/cmp/Workday/jobs' },
  'JPMorgan Chase':          { direct: 'https://careers.jpmorgan.com/us/en/jobs', li: 'https://www.linkedin.com/jobs/jpmorgan-chase-jobs', in: 'https://www.indeed.com/cmp/JPMorgan-Chase/jobs' },
  'Goldman Sachs':           { direct: 'https://www.goldmansachs.com/careers/find-a-job/', li: 'https://www.linkedin.com/jobs/goldman-sachs-jobs', in: 'https://www.indeed.com/cmp/Goldman-Sachs/jobs' },
  'Morgan Stanley':          { direct: 'https://morganstanley.tal.net/vx/lang-en-GB/mobile-0/brand-2/xf-53b8d5a70f9e/candidate/jobboard/vacancy/2/adv/', li: 'https://www.linkedin.com/jobs/morgan-stanley-jobs', in: 'https://www.indeed.com/cmp/Morgan-Stanley/jobs' },
  'Citigroup':               { direct: 'https://jobs.citi.com/search-jobs', li: 'https://www.linkedin.com/jobs/citi-jobs', in: 'https://www.indeed.com/cmp/Citigroup/jobs' },
  'Bank of America':         { direct: 'https://careers.bankofamerica.com/en-us/jobs', li: 'https://www.linkedin.com/jobs/bank-of-america-jobs', in: 'https://www.indeed.com/cmp/Bank-of-America/jobs' },
  'Wells Fargo':             { direct: 'https://www.wellsfargojobs.com/en/', li: 'https://www.linkedin.com/jobs/wells-fargo-jobs', in: 'https://www.indeed.com/cmp/Wells-Fargo/jobs' },
  'Infosys':                 { direct: 'https://career.infosys.com/jobdesc', li: 'https://www.linkedin.com/jobs/infosys-jobs', in: 'https://www.indeed.com/cmp/Infosys/jobs' },
  'Tata Consultancy Services':{ direct: 'https://ibegin.tcs.com/iBegin/', li: 'https://www.linkedin.com/jobs/tata-consultancy-services-jobs', in: 'https://www.indeed.com/cmp/Tata-Consultancy-Services/jobs' },
  'Wipro':                   { direct: 'https://careers.wipro.com/careers-home/', li: 'https://www.linkedin.com/jobs/wipro-jobs', in: 'https://www.indeed.com/cmp/Wipro/jobs' },
  'Cognizant':               { direct: 'https://careers.cognizant.com/global/en/search-results', li: 'https://www.linkedin.com/jobs/cognizant-jobs', in: 'https://www.indeed.com/cmp/Cognizant/jobs' },
  'HCL Technologies':        { direct: 'https://www.hcltech.com/careers', li: 'https://www.linkedin.com/jobs/hcl-technologies-jobs', in: 'https://www.indeed.com/cmp/HCL-Technologies/jobs' },
  'Accenture':               { direct: 'https://www.accenture.com/us-en/careers/jobsearch', li: 'https://www.linkedin.com/jobs/accenture-jobs', in: 'https://www.indeed.com/cmp/Accenture/jobs' },
  'Capgemini':               { direct: 'https://www.capgemini.com/us-en/careers/job-search/', li: 'https://www.linkedin.com/jobs/capgemini-jobs', in: 'https://www.indeed.com/cmp/Capgemini/jobs' },
  'Deloitte':                { direct: 'https://apply.deloitte.com/careers/SearchJobs', li: 'https://www.linkedin.com/jobs/deloitte-jobs', in: 'https://www.indeed.com/cmp/Deloitte/jobs' },
  'Tesla':                   { direct: 'https://www.tesla.com/careers/search/', li: 'https://www.linkedin.com/jobs/tesla-jobs', in: 'https://www.indeed.com/cmp/Tesla/jobs' },
  'Boeing':                  { direct: 'https://jobs.boeing.com/search-jobs', li: 'https://www.linkedin.com/jobs/boeing-jobs', in: 'https://www.indeed.com/cmp/Boeing/jobs' },
  'SpaceX':                  { direct: 'https://www.spacex.com/careers/', li: 'https://www.linkedin.com/jobs/spacex-jobs', in: 'https://www.indeed.com/cmp/SpaceX/jobs' },
  'Lockheed Martin':         { direct: 'https://www.lockheedmartinjobs.com/search-jobs', li: 'https://www.linkedin.com/jobs/lockheed-martin-jobs', in: 'https://www.indeed.com/cmp/Lockheed-Martin/jobs' },
  'Raytheon Technologies':   { direct: 'https://jobs.rtx.com/search-jobs', li: 'https://www.linkedin.com/jobs/raytheon-technologies-jobs', in: 'https://www.indeed.com/cmp/Raytheon-Technologies/jobs' },
  'General Motors':          { direct: 'https://search-careers.gm.com/jobs', li: 'https://www.linkedin.com/jobs/general-motors-jobs', in: 'https://www.indeed.com/cmp/General-Motors/jobs' },
  'Ford Motor Company':      { direct: 'https://fordmotorcompany.jobs/ford-motor-company-us/', li: 'https://www.linkedin.com/jobs/ford-motor-company-jobs', in: 'https://www.indeed.com/cmp/Ford-Motor-Company/jobs' },
  'Johnson & Johnson':       { direct: 'https://jobs.jnj.com/jobs', li: 'https://www.linkedin.com/jobs/johnson-johnson-jobs', in: 'https://www.indeed.com/cmp/Johnson-&-Johnson/jobs' },
  'Pfizer':                  { direct: 'https://www.pfizer.com/about/careers/ph_search_results', li: 'https://www.linkedin.com/jobs/pfizer-jobs', in: 'https://www.indeed.com/cmp/Pfizer/jobs' },
  'Merck':                   { direct: 'https://jobs.merck.com/us/en/search-results', li: 'https://www.linkedin.com/jobs/merck-jobs', in: 'https://www.indeed.com/cmp/Merck/jobs' },
  'Eli Lilly':               { direct: 'https://careers.lilly.com/us/en/search-results', li: 'https://www.linkedin.com/jobs/eli-lilly-jobs', in: 'https://www.indeed.com/cmp/Eli-Lilly-and-Company/jobs' },
  'Abbott Laboratories':     { direct: 'https://www.jobs.abbott/us/en/search-results', li: 'https://www.linkedin.com/jobs/abbott-jobs', in: 'https://www.indeed.com/cmp/Abbott-Laboratories/jobs' },
  'Walmart':                 { direct: 'https://careers.walmart.com/results', li: 'https://www.linkedin.com/jobs/walmart-jobs', in: 'https://www.indeed.com/cmp/Walmart/jobs' },
};

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEvents();
  loadStats();
  loadCompanies();
});

function checkAuth() {
  const token = localStorage.getItem('h1b_token');
  if (token) {
    try { user = JSON.parse(localStorage.getItem('h1b_user')); updateAuthUI(); }
    catch(e) { clearAuth(); }
  }
}

function setupEvents() {
  document.getElementById('searchBtn').onclick = doSearch;
  document.getElementById('fieldInput').addEventListener('keypress', e => e.key === 'Enter' && doSearch());
  document.getElementById('authBtn').onclick = () => openModal('authModal');
  document.getElementById('closeAuth').onclick = () => closeModal('authModal');
  document.getElementById('closeCompany').onclick = () => closeModal('companyModal');
  document.getElementById('authForm').onsubmit = handleAuth;
  document.getElementById('sortSelect').onchange = e => sortAndRender(e.target.value);
  document.getElementById('navHome').onclick = e => { e.preventDefault(); showHome(); };
  document.getElementById('navBrowse').onclick = e => { e.preventDefault(); showBrowse(); };
  document.getElementById('navSaved').onclick = e => { e.preventDefault(); loadSaved(); };
  document.getElementById('toggleAuth').onclick = e => { e.preventDefault(); toggleAuthMode(); };

  // Chip filters
  document.querySelectorAll('.chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.dataset.filter;
      document.getElementById('fieldInput').value = val;
      filterAndRender(val);
    };
  });

  // Close modals on backdrop click
  document.getElementById('authModal').onclick = e => { if(e.target.id==='authModal') closeModal('authModal'); };
  document.getElementById('companyModal').onclick = e => { if(e.target.id==='companyModal') closeModal('companyModal'); };
}

// ── STATS ─────────────────────────────────────────────────────

async function loadStats() {
  try {
    const r = await fetch(`${API}/stats`);
    const d = await r.json();
    document.getElementById('companyCount').textContent = (d.totalCompanies || 0).toLocaleString();
    document.getElementById('totalPetitions').textContent = (d.totalPetitions || 0).toLocaleString();
    document.getElementById('avgApproval').textContent = (d.avgApprovalRate || 0) + '%';
  } catch(e) {
    document.getElementById('companyCount').textContent = '100+';
  }
}

// ── LOAD COMPANIES ────────────────────────────────────────────

async function loadCompanies() {
  try {
    const r = await fetch(`${API}/companies/search?limit=200`);
    const d = await r.json();
    allCompanies = d.companies || [];
    filtered = [...allCompanies];
    setTitle(`${allCompanies.length} Verified H-1B Sponsoring Companies`);
    render(filtered);
  } catch(e) {
    document.getElementById('companyGrid').innerHTML = `<div class="no-results"><p class="nr-title">Failed to load companies</p><p>Please refresh the page</p></div>`;
  }
}

// ── SEARCH & FILTER ───────────────────────────────────────────

function doSearch() {
  const q = document.getElementById('fieldInput').value.trim();
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (!q) document.querySelector('.chip[data-filter=""]').classList.add('active');
  filterAndRender(q);
}

function filterAndRender(q) {
  if (!q) {
    filtered = [...allCompanies];
    setTitle(`${allCompanies.length} Verified H-1B Sponsoring Companies`);
  } else {
    const ql = q.toLowerCase();
    filtered = allCompanies.filter(c =>
      c.name?.toLowerCase().includes(ql) ||
      c.industry?.toLowerCase().includes(ql)
    );
    setTitle(`${filtered.length} Companies matching "${q}"`);
  }
  sortAndRender(document.getElementById('sortSelect').value);
}

function sortAndRender(by) {
  const copy = [...filtered];
  if (by === 'approval') copy.sort((a,b) => (b.approval_rate||0)-(a.approval_rate||0));
  else if (by === 'salary') copy.sort((a,b) => (b.average_salary||0)-(a.average_salary||0));
  else if (by === 'trust') copy.sort((a,b) => (b.trust_score||0)-(a.trust_score||0));
  else copy.sort((a,b) => (b.h1b_petitions_filed||0)-(a.h1b_petitions_filed||0));
  render(copy);
}

function setTitle(t) { document.getElementById('resultsTitle').textContent = t; }

// ── RENDER CARDS ──────────────────────────────────────────────

function render(companies) {
  const grid = document.getElementById('companyGrid');
  if (!companies.length) {
    grid.innerHTML = `<div class="no-results">
      <p class="nr-title">No companies found</p>
      <p>Try: Technology, Finance, Healthcare, Consulting, Pharma</p>
    </div>`;
    return;
  }

  grid.innerHTML = companies.map(c => {
    const tc = c.trust_score >= 9 ? 't9' : c.trust_score >= 7 ? 't7' : 'tlow';
    const urls = JOB_URLS[c.name] || {};
    const applyUrl = urls.direct || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(c.name + ' visa sponsorship')}`;

    return `<div class="company-card" onclick="openCompany('${c.id}')">
      <div class="card-top">
        <div class="card-name">${esc(c.name)}</div>
        <span class="tbadge ${tc}">${c.trust_score}/10</span>
      </div>
      <span class="ind-pill">${esc(c.industry || 'N/A')}</span>
      <div class="card-stats">
        <div class="cs"><span class="csv">${(c.h1b_petitions_filed||0).toLocaleString()}</span><span class="csl">Petitions</span></div>
        <div class="cs"><span class="csv cgreen">${(c.approval_rate||0).toFixed(0)}%</span><span class="csl">Approval</span></div>
        <div class="cs"><span class="csv">${c.average_salary ? '$'+(c.average_salary/1000).toFixed(0)+'k' : 'N/A'}</span><span class="csl">Avg Salary</span></div>
      </div>
      <div class="card-badges">
        <span class="bdg ${c.sponsors_green_cards ? 'bdg-green' : 'bdg-gray'}">${c.sponsors_green_cards ? '✅ Green Card' : 'H-1B Only'}</span>
        ${c.wage_level ? `<span class="bdg bdg-blue">${esc(c.wage_level)}</span>` : ''}
      </div>
      <div class="card-actions">
        <a href="${applyUrl}" target="_blank" rel="noopener" class="btn-apply" onclick="event.stopPropagation()">
          Apply Now →
        </a>
        ${user ? `<button class="btn-save-card" onclick="event.stopPropagation();saveCompany('${c.id}',this)">⭐ Save</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── COMPANY DETAIL MODAL ──────────────────────────────────────

async function openCompany(id) {
  const c = allCompanies.find(x => x.id === id);
  if (!c) return;
  const urls = JOB_URLS[c.name] || {};

  const jobLinksHtml = `
    <div class="job-links">
      ${urls.direct ? `<a href="${urls.direct}" target="_blank" class="jlink jl-direct">🔗 Careers Page</a>` : ''}
      ${urls.li ? `<a href="${urls.li}" target="_blank" class="jlink jl-li">in LinkedIn</a>` : ''}
      ${urls.in ? `<a href="${urls.in}" target="_blank" class="jlink jl-in">Indeed</a>` : ''}
      <a href="https://www.glassdoor.com/Jobs/${encodeURIComponent(c.name.replace(/\s+/g,'-'))}-Jobs-E0.htm"
         target="_blank" class="jlink jl-gd">Glassdoor</a>
      <a href="https://www.google.com/search?q=${encodeURIComponent(c.name+' h1b sponsorship jobs 2024')}"
         target="_blank" class="jlink jl-direct" style="background:#34a853">Google Jobs</a>
    </div>
  `;

  document.getElementById('companyDetails').innerHTML = `
    <div class="d-header">
      <div>
        <h2>${esc(c.name)}</h2>
        <span class="ind-pill" style="margin-top:.3rem;display:inline-block">${esc(c.industry||'')}</span>
      </div>
      <span class="tbadge ${c.trust_score>=9?'t9':c.trust_score>=7?'t7':'tlow'}" style="font-size:.9rem;padding:.3rem .7rem">
        Trust ${c.trust_score}/10
      </span>
    </div>

    <div class="d-stats">
      <div class="ds"><span class="ds-lbl">H-1B Petitions Filed</span><span class="ds-val" style="color:var(--accent)">${(c.h1b_petitions_filed||0).toLocaleString()}</span></div>
      <div class="ds"><span class="ds-lbl">Approval Rate</span><span class="ds-val" style="color:var(--green)">${(c.approval_rate||0).toFixed(1)}%</span></div>
      <div class="ds"><span class="ds-lbl">Denial Rate</span><span class="ds-val" style="color:var(--red)">${(c.denial_rate||0).toFixed(1)}%</span></div>
      <div class="ds"><span class="ds-lbl">Average Salary</span><span class="ds-val">${c.average_salary?'$'+c.average_salary.toLocaleString():'N/A'}</span></div>
      <div class="ds"><span class="ds-lbl">Wage Level</span><span class="ds-val">${c.wage_level||'N/A'}</span></div>
      <div class="ds"><span class="ds-lbl">Green Card Sponsor</span><span class="ds-val">${c.sponsors_green_cards?'✅ Yes':'⚠️ No'}</span></div>
    </div>

    <div class="d-jobs">
      <h3>💼 Apply at ${esc(c.name)}</h3>
      ${jobLinksHtml}
    </div>

    ${user ? `
      <button onclick="saveCompany('${c.id}',this)" style="margin-top:1.5rem;width:100%;padding:.75rem;
        background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;
        font-size:.95rem;cursor:pointer">
        ⭐ Save This Company
      </button>` : `
      <p style="text-align:center;margin-top:1.5rem;color:var(--text2);font-size:.85rem">
        <a href="#" onclick="openModal('authModal')" style="color:var(--accent)">Login</a> to save companies & track applications
      </p>`}
  `;
  openModal('companyModal');
}

// ── SAVE COMPANY ──────────────────────────────────────────────

async function saveCompany(id, btn) {
  if (!user) { openModal('authModal'); return; }
  try {
    const r = await fetch(`${API}/companies/${id}/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('h1b_token')}`,
        'X-User-Id': user.userId || user.id
      }
    });
    if (r.ok) {
      btn.textContent = '✅ Saved';
      btn.classList.add('saved');
      btn.disabled = true;
      toast('Company saved! ⭐', 'success');
    }
  } catch(e) { toast('Failed to save', 'error'); }
}

// ── LOAD SAVED ────────────────────────────────────────────────

async function loadSaved() {
  if (!user) { openModal('authModal'); return; }
  try {
    const r = await fetch(`${API}/saved-companies`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('h1b_token')}`,
        'X-User-Id': user.userId || user.id
      }
    });
    const d = await r.json();
    const companies = d.companies || [];
    filtered = companies;
    setTitle(`⭐ Your Saved Companies (${companies.length})`);
    render(companies);
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
  } catch(e) { toast('Failed to load saved companies', 'error'); }
}

// ── AUTH ──────────────────────────────────────────────────────

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const pass  = document.getElementById('passwordInput').value.trim();
  if (!email || !pass) { toast('Fill in all fields', 'error'); return; }

  const btn = document.getElementById('authSubmit');
  btn.disabled = true; btn.textContent = 'Please wait...';

  try {
    const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const d = await r.json();

    if (!r.ok) { toast(d.error || 'Authentication failed', 'error'); return; }

    if (d.token) {
      localStorage.setItem('h1b_token', d.token);
      localStorage.setItem('h1b_user', JSON.stringify(d));
      user = d;
      updateAuthUI();
      closeModal('authModal');
      render(filtered); // re-render to show save buttons
      toast(isLogin ? '👋 Welcome back!' : '🎉 Welcome to H1BHunter!', 'success');
    } else if (!isLogin) {
      // Registered, now login
      toast('Account created! Logging you in...', 'success');
      setTimeout(async () => {
        const r2 = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });
        const d2 = await r2.json();
        if (d2.token) {
          localStorage.setItem('h1b_token', d2.token);
          localStorage.setItem('h1b_user', JSON.stringify(d2));
          user = d2;
          updateAuthUI();
          closeModal('authModal');
          render(filtered);
          toast('🎉 Welcome to H1BHunter!', 'success');
        }
      }, 500);
    }
  } catch(err) {
    toast('Connection error. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = isLogin ? 'Login' : 'Sign Up';
  }
}

function toggleAuthMode() {
  isLogin = !isLogin;
  document.getElementById('authTitle').textContent = isLogin ? 'Welcome Back' : 'Create Account';
  document.getElementById('authSub').textContent = isLogin ? 'Sign in to save companies & get job alerts' : 'Free account — save companies & track applications';
  document.getElementById('authSubmit').textContent = isLogin ? 'Login' : 'Sign Up';
  document.getElementById('toggleAuth').textContent = isLogin ? 'Sign up free' : 'Login instead';
  document.querySelector('.toggle-line').firstChild.textContent = isLogin ? "Don't have an account? " : "Already have an account? ";
}

function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if (user) {
    btn.textContent = '👤 ' + (user.email?.split('@')[0] || 'Me');
    btn.onclick = showUserMenu;
  } else {
    btn.textContent = 'Login';
    btn.onclick = () => openModal('authModal');
  }
}

function showUserMenu() {
  const existing = document.getElementById('userMenu');
  if (existing) { existing.remove(); return; }
  const m = document.createElement('div');
  m.id = 'userMenu';
  m.style.cssText = 'position:fixed;top:58px;right:1.5rem;z-index:300;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:.75rem;min-width:180px;box-shadow:0 8px 30px rgba(0,0,0,.5)';
  m.innerHTML = `
    <p style="font-size:.75rem;color:var(--text2);margin-bottom:.6rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">${user.email}</p>
    <button onclick="loadSaved();document.getElementById('userMenu').remove()" style="width:100%;padding:.5rem;background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:7px;cursor:pointer;margin-bottom:.4rem;font-size:.82rem">⭐ Saved Companies</button>
    <button onclick="logout()" style="width:100%;padding:.5rem;background:rgba(239,68,68,.15);border:1px solid var(--red);color:var(--red);border-radius:7px;cursor:pointer;font-size:.82rem">Logout</button>
  `;
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 100);
}

function logout() {
  clearAuth();
  render(filtered);
  toast('Logged out', 'info');
}

function clearAuth() {
  localStorage.removeItem('h1b_token');
  localStorage.removeItem('h1b_user');
  user = null;
  updateAuthUI();
}

// ── NAVIGATION ────────────────────────────────────────────────

function showHome() {
  document.getElementById('heroSection').style.display = '';
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
  setNavActive('navHome');
}

function showBrowse() {
  document.getElementById('heroSection').style.display = 'none';
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
  setNavActive('navBrowse');
}

function setNavActive(id) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// ── MODAL HELPERS ─────────────────────────────────────────────

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ── TOAST ─────────────────────────────────────────────────────

function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast t-${type}`;
  t.textContent = msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 3000);
  setTimeout(() => t.remove(), 3400);
}

// ── UTILS ─────────────────────────────────────────────────────

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
