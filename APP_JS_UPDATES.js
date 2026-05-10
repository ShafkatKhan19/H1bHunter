/**
 * PUBLIC/APP.JS - MAJOR UPDATES FOR NEW FEATURES
 * This replaces the existing app.js
 */

const API_BASE = '/api';
let currentUser = null;
let currentPage = 'search';
let resumeGlobalData = {
  jobDescription: '',
  resumeContent: '',
  sections: {},
  jobUrl: ''
};

// ── INITIALIZATION ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupNavigationTabs();
  setupModalHandlers();
  loadCapSeasonBanner();
  checkAuthStatus();
});

function initApp() {
  const token = localStorage.getItem('h1b_token');
  if (token) {
    currentUser = JSON.parse(localStorage.getItem('h1b_user') || '{}');
    updateAuthUI();
  }
  showPage('search');
}

function checkAuthStatus() {
  const token = localStorage.getItem('h1b_token');
  const authBtn = document.getElementById('authBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (token && currentUser) {
    authBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    authBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}

// ── NAVIGATION TABS ───────────────────────────────────────────────────────────

function setupNavigationTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const page = tab.dataset.page;
      showPage(page);
      updateActiveTab(tab);
    });
  });
  
  // Auth handlers
  document.getElementById('authBtn').addEventListener('click', () => showAuthModal());
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

function updateActiveTab(activeTab) {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  activeTab.classList.add('active');
}

function showPage(pageName) {
  currentPage = pageName;
  
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  const pageEl = document.getElementById(pageName + 'Page');
  if (pageEl) {
    pageEl.classList.add('active');
    
    // Load page-specific data
    if (pageName === 'search') {
      loadCompanyCount();
    } else if (pageName === 'jobs') {
      loadJobsPage();
    } else if (pageName === 'resume') {
      loadResumePage();
    } else if (pageName === 'dashboard') {
      loadDashboard();
    }
  }
  
  // Update active tab
  const tab = document.querySelector(`[data-page="${pageName}"]`);
  if (tab) updateActiveTab(tab);
}

// ── CAP SEASON COUNTDOWN ──────────────────────────────────────────────────────

async function loadCapSeasonBanner() {
  try {
    const response = await fetch(`${API_BASE}/cap-season-status`);
    const data = await response.json();
    
    if (data.isCapSeason) {
      const banner = document.getElementById('capSeasonBanner');
      banner.querySelector('#capSeasonText').textContent = `Cap season closes in ${data.daysRemaining} days`;
      banner.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Cap season check failed:', err);
  }
}

// ── SEARCH PAGE ───────────────────────────────────────────────────────────────

async function loadCompanyCount() {
  try {
    const response = await fetch(`${API_BASE}/companies/search?limit=1`);
    const data = await response.json();
    document.getElementById('companyCount').textContent = data.total || '500+';
  } catch (err) {
    console.error('Company count error:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', searchCompanies);
    
    const fieldInput = document.getElementById('fieldInput');
    const locationInput = document.getElementById('locationInput');
    if (fieldInput) fieldInput.addEventListener('keypress', e => e.key === 'Enter' && searchCompanies());
    if (locationInput) locationInput.addEventListener('keypress', e => e.key === 'Enter' && searchCompanies());
  }
});

async function searchCompanies() {
  const field = document.getElementById('fieldInput').value.trim();
  const location = document.getElementById('locationInput').value.trim();
  
  if (!field && !location) {
    alert('Please enter a field or location');
    return;
  }
  
  try {
    const params = new URLSearchParams();
    if (field) params.append('field', field);
    if (location) params.append('location', location);
    params.append('limit', currentUser?.is_premium ? 100 : 5);
    
    const response = await fetch(`${API_BASE}/companies/search?${params}`);
    const data = await response.json();
    
    displaySearchResults(data.companies || [], data.total || 0);
  } catch (err) {
    console.error('Search error:', err);
    alert('Search failed');
  }
}

function displaySearchResults(companies, total) {
  const resultsSection = document.getElementById('resultsSection');
  const tbody = document.getElementById('resultsTableBody');
  
  const resultLimit = currentUser?.is_premium ? total : 5;
  const displayedCompanies = companies.slice(0, resultLimit);
  const hiddenCount = Math.max(0, total - resultLimit);
  
  tbody.innerHTML = displayedCompanies.map(company => `
    <tr>
      <td><strong>${escapeHtml(company.name)}</strong></td>
      <td>${escapeHtml(company.industry || 'N/A')}</td>
      <td>${company.h1b_petitions_filed ? 'Yes' : 'No'}</td>
      <td class="approval-rate-cell ${!currentUser?.is_premium ? 'locked' : ''}">
        ${currentUser?.is_premium ? (company.approval_rate?.toFixed(1) || 'N/A') + '%' : '<span class="approval-rate-locked">---%</span>'}
      </td>
      <td>
        <button class="btn btn-sm" onclick="viewCompanyDetails('${company.id}')">View</button>
        ${currentUser ? `<button class="btn btn-sm" onclick="saveCompany('${company.id}')">Save</button>` : ''}
      </td>
    </tr>
  `).join('');
  
  // Show unlock row
  const unlockRow = document.getElementById('unlockRow');
  if (hiddenCount > 0 && !currentUser?.is_premium) {
    unlockRow.querySelector('#moreCount').textContent = hiddenCount;
    unlockRow.classList.remove('hidden');
  } else {
    unlockRow.classList.add('hidden');
  }
  
  resultsSection.classList.remove('hidden');
}

function viewCompanyDetails(companyId) {
  if (!currentUser?.is_premium) {
    showUpgradeModal();
    return;
  }
  // TODO: Show company modal with details
}

async function saveCompany(companyId) {
  if (!currentUser) {
    showAuthModal();
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/companies/${companyId}/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('h1b_token')}`
      }
    });
    
    if (response.ok) {
      alert('Company saved');
    } else {
      alert('Failed to save company');
    }
  } catch (err) {
    console.error('Save error:', err);
  }
}

// ── JOBS PAGE ─────────────────────────────────────────────────────────────────

function loadJobsPage() {
  if (!currentUser?.is_premium) {
    document.getElementById('jobsLockedState').classList.remove('hidden');
    document.getElementById('jobsList').classList.add('hidden');
    return;
  }
  
  document.getElementById('jobsLockedState').classList.add('hidden');
  document.getElementById('jobsList').classList.remove('hidden');
  
  fetchAndDisplayJobs();
}

async function fetchAndDisplayJobs() {
  try {
    const response = await fetch(`${API_BASE}/jobs`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('h1b_token')}` }
    });
    
    const data = await response.json();
    displayJobs(data.jobs || []);
  } catch (err) {
    console.error('Jobs fetch error:', err);
  }
}

function displayJobs(jobs) {
  const container = document.getElementById('jobsList');
  
  container.innerHTML = jobs.map(job => `
    <div class="job-card">
      <div class="job-company">${escapeHtml(job.companyName)}</div>
      <h4>${escapeHtml(job.jobTitle)}</h4>
      <div class="job-location">📍 ${escapeHtml(job.location || 'Remote')}</div>
      
      <div class="job-analysis ${job.analysis.safetyLevel.toLowerCase()}">
        <strong>International Student Status: ${job.analysis.safetyLevel}</strong>
        <p>${job.analysis.reason}</p>
      </div>
      
      <a href="${job.applyUrl}" target="_blank" class="btn btn-primary">Apply</a>
    </div>
  `).join('');
}

// ── RESUME PAGE ───────────────────────────────────────────────────────────────

function loadResumePage() {
  if (!currentUser?.is_premium) {
    document.getElementById('resumeLockedState').classList.remove('hidden');
    document.getElementById('resumeBuilder').classList.add('hidden');
    return;
  }
  
  document.getElementById('resumeLockedState').classList.add('hidden');
  document.getElementById('resumeBuilder').classList.remove('hidden');
  
  // Load attempts
  loadResumeAttempts();
}

async function loadResumeAttempts() {
  try {
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('h1b_token')}` }
    });
    const data = await response.json();
    
    const remaining = data.resumeAttempts.remaining;
    document.getElementById('attemptsText').textContent = `${remaining} attempts remaining`;
  } catch (err) {
    console.error('Attempts load error:', err);
  }
}

async function resumeStep1() {
  const jobUrl = document.getElementById('jobUrlInput').value;
  if (!jobUrl) {
    alert('Please enter a job URL');
    return;
  }
  
  document.getElementById('step1Status').textContent = 'Extracting job requirements...';
  document.getElementById('step1Status').className = 'status loading';
  
  try {
    const response = await fetch(`${API_BASE}/resume/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('h1b_token')}`
      },
      body: JSON.stringify({ jobUrl, resumeContent: '' })
    });
    
    if (response.ok) {
      const data = await response.json();
      resumeGlobalData.jobUrl = jobUrl;
      resumeGlobalData.jobDescription = data.jobDescription;
      
      document.getElementById('step1Status').textContent = 'Job extracted successfully';
      document.getElementById('step1Status').className = 'status success';
      
      showResumeStep(2);
    } else {
      throw new Error('Failed to extract job');
    }
  } catch (err) {
    document.getElementById('step1Status').textContent = err.message;
    document.getElementById('step1Status').className = 'status error';
  }
}

async function resumeStep2() {
  const fileInput = document.getElementById('resumeFileInput');
  if (!fileInput.files[0]) {
    alert('Please select a resume file');
    return;
  }
  
  const formData = new FormData();
  formData.append('resume', fileInput.files[0]);
  
  document.getElementById('step2Status').textContent = 'Parsing resume...';
  document.getElementById('step2Status').className = 'status loading';
  
  try {
    const response = await fetch(`${API_BASE}/resume/parse`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('h1b_token')}` },
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      resumeGlobalData.resumeContent = data.resumeContent;
      
      document.getElementById('step2Status').textContent = 'Resume parsed successfully';
      document.getElementById('step2Status').className = 'status success';
      
      // Move to step 3: show section comparisons
      generateResumeSections();
      showResumeStep(3);
    } else {
      throw new Error('Failed to parse resume');
    }
  } catch (err) {
    document.getElementById('step2Status').textContent = err.message;
    document.getElementById('step2Status').className = 'status error';
  }
}

async function generateResumeSections() {
  const sections = ['Summary', 'Skills', 'Experience', 'Education'];
  const container = document.getElementById('sectionsContainer');
  
  container.innerHTML = '';
  
  for (const section of sections) {
    const statusEl = document.createElement('div');
    statusEl.className = 'status loading';
    statusEl.textContent = `Improving ${section}...`;
    container.appendChild(statusEl);
    
    try {
      const response = await fetch(`${API_BASE}/resume/improve-section`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('h1b_token')}`
        },
        body: JSON.stringify({
          jobDescription: resumeGlobalData.jobDescription,
          currentSection: 'Sample content', // Extract from parsed resume
          sectionName: section
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        resumeGlobalData.sections[section] = data.improved;
        
        // Create review card
        const card = document.createElement('div');
        card.className = 'resume-section-review';
        card.innerHTML = `
          <h4>${section} <span class="section-status-badge pending">Pending Review</span></h4>
          <div class="section-comparison">
            <div class="original"><h4>Original</h4><p>Sample content</p></div>
            <div class="suggested"><h4>Suggested</h4><p>${data.improved}</p></div>
          </div>
          <button class="btn btn-primary" onclick="editSectionModal('${section}')">Edit</button>
          <button class="btn btn-outline" onclick="approveSection('${section}')">Approve</button>
        `;
        
        // Replace status element
        statusEl.replaceWith(card);
      }
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'status error';
    }
  }
}

function editSectionModal(section) {
  // Show modal for editing
  const modal = document.getElementById('resumeSectionModal');
  document.getElementById('sectionTitle').textContent = `Edit ${section}`;
  document.getElementById('originalSection').textContent = 'Original content';
  document.getElementById('suggestedSection').value = resumeGlobalData.sections[section] || '';
  modal.classList.remove('hidden');
  
  // Store current section for approval
  modal.dataset.currentSection = section;
}

function approveSection(section) {
  const card = event.target.closest('.resume-section-review');
  const badge = card.querySelector('.section-status-badge');
  badge.textContent = 'Approved';
  badge.className = 'section-status-badge approved';
}

function approveSectionEdit() {
  const section = document.getElementById('resumeSectionModal').dataset.currentSection;
  const improved = document.getElementById('suggestedSection').value;
  resumeGlobalData.sections[section] = improved;
  approveSection(section);
  closeSectionModal();
}

async function downloadResume() {
  // Check attempt count and charge if needed
  try {
    const dashResponse = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('h1b_token')}` }
    });
    const dashData = await dashResponse.json();
    
    if (dashData.resumeAttempts.remaining <= 0) {
      // Show payment confirmation
      if (confirm('This will cost $0.99. Proceed?')) {
        await chargeResumeAttempt();
      } else {
        return;
      }
    }
    
    // Generate resume
    const response = await fetch(`${API_BASE}/resume/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('h1b_token')}`
      },
      body: JSON.stringify({ sections: resumeGlobalData.sections })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.docx';
      a.click();
    }
  } catch (err) {
    console.error('Download error:', err);
    alert('Failed to generate resume');
  }
}

async function chargeResumeAttempt() {
  try {
    const response = await fetch(`${API_BASE}/subscription/charge-resume-attempt`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('h1b_token')}` }
    });
    
    if (response.ok) {
      alert('Payment successful');
      return true;
    } else {
      alert('Payment failed');
      return false;
    }
  } catch (err) {
    console.error('Charge error:', err);
    return false;
  }
}

function showResumeStep(stepNum) {
  document.querySelectorAll('.resume-step').forEach(step => {
    step.classList.remove('active');
  });
  document.getElementById('step' + stepNum).classList.add('active');
}

// ── DASHBOARD PAGE ────────────────────────────────────────────────────────────

async function loadDashboard() {
  if (!currentUser) {
    alert('Please log in first');
    showPage('search');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/dashboard`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('h1b_token')}` }
    });
    
    const data = await response.json();
    displayDashboard(data);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function displayDashboard(data) {
  document.getElementById('dashEmail').textContent = data.user.email;
  document.getElementById('dashPlan').textContent = data.user.isPremium ? 'Premium' : 'Free';
  document.getElementById('dashSubPlan').textContent = data.subscription.planType;
  document.getElementById('dashAttempts').textContent = `${data.resumeAttempts.used}/${data.resumeAttempts.used + data.resumeAttempts.remaining} used`;
  
  if (data.subscription.renewalDate) {
    document.getElementById('dashRenewal').textContent = `Renews on ${new Date(data.subscription.renewalDate).toLocaleDateString()}`;
    document.getElementById('cancelSubBtn').classList.remove('hidden');
  }
  
  // Saved companies
  const companiesHtml = data.savedCompanies.length > 0
    ? data.savedCompanies.map(c => `<div class="company-item"><strong>${c.name}</strong><p>${c.industry} - ${c.approval_rate}% approval</p></div>`).join('')
    : '<p>No saved companies</p>';
  document.getElementById('savedCompaniesList').innerHTML = companiesHtml;
  
  // Job history
  const jobsHtml = data.jobClicks.length > 0
    ? data.jobClicks.map(j => `<div class="job-item"><strong>${j.job_title}</strong><p>${j.company_name} - ${new Date(j.clicked_at).toLocaleDateString()}</p></div>`).join('')
    : '<p>No job history</p>';
  document.getElementById('jobHistoryList').innerHTML = jobsHtml;
}

async function cancelSubscription() {
  if (confirm('Cancel subscription at the end of your billing period?')) {
    try {
      const response = await fetch(`${API_BASE}/subscription/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('h1b_token')}` }
      });
      
      if (response.ok) {
        alert('Subscription cancelled');
        loadDashboard();
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Failed to cancel subscription');
    }
  }
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

function showAuthModal() {
  document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
}

async function handleAuth(event) {
  event.preventDefault();
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  const isLogin = document.getElementById('authTitle').textContent === 'Login';
  
  try {
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('h1b_token', data.token);
      localStorage.setItem('h1b_user', JSON.stringify(data.user));
      currentUser = data.user;
      closeAuthModal();
      updateAuthUI();
    } else {
      alert('Auth failed');
    }
  } catch (err) {
    console.error('Auth error:', err);
  }
}

function logout() {
  localStorage.removeItem('h1b_token');
  localStorage.removeItem('h1b_user');
  currentUser = null;
  checkAuthStatus();
  showPage('search');
}

function updateAuthUI() {
  checkAuthStatus();
}

// ── MODALS ────────────────────────────────────────────────────────────────────

function setupModalHandlers() {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.add('hidden');
    }
  });
}

function showUpgradeModal(event) {
  event?.preventDefault();
  document.getElementById('upgradeModal').classList.remove('hidden');
}

function closeUpgradeModal() {
  document.getElementById('upgradeModal').classList.add('hidden');
}

function closeSectionModal() {
  document.getElementById('resumeSectionModal').classList.add('hidden');
}

function closePaymentModal() {
  document.getElementById('paymentConfirmModal').classList.add('hidden');
}

async function startCheckout(planType) {
  // TODO: Integrate Stripe checkout
  alert(`Starting checkout for: ${planType}`);
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleAuthMode(event) {
  event.preventDefault();
  const isLogin = document.getElementById('authTitle').textContent === 'Login';
  document.getElementById('authTitle').textContent = isLogin ? 'Sign Up' : 'Login';
  document.querySelector('.toggle-auth').innerHTML = isLogin
    ? 'Already have an account? <a href="#">Login</a>'
    : 'Don\'t have an account? <a href="#">Sign up</a>';
}
