/**
 * H1BHunter Frontend App
 */

const API_BASE = '/api';
let currentUser = null;
let currentCompanies = [];

// DOM Elements
const searchBtn = document.getElementById('searchBtn');
const fieldInput = document.getElementById('fieldInput');
const locationInput = document.getElementById('locationInput');
const companyGrid = document.getElementById('companyGrid');
const companyCount = document.getElementById('companyCount');
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const modalClose = document.querySelector('.modal-close');
const resultsSection = document.getElementById('resultsSection');
const herοSection = document.getElementById('heroSection');
const companyModal = document.getElementById('companyModal');
const companyDetails = document.getElementById('companyDetails');
const optguardSection = document.getElementById('optguardSection');

// Auth
let isLoginMode = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  loadCompanyCount();
  setupEventListeners();
});

function initApp() {
  // Check if user is logged in
  const token = localStorage.getItem('h1b_token');
  if (token) {
    currentUser = JSON.parse(localStorage.getItem('h1b_user'));
    updateAuthUI();
  }
}

function setupEventListeners() {
  searchBtn.addEventListener('click', searchCompanies);
  authBtn.addEventListener('click', toggleAuthModal);
  modalClose.addEventListener('click', closeAuthModal);
  authForm.addEventListener('submit', handleAuth);

  // Close modal on background click
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });

  companyModal.addEventListener('click', (e) => {
    if (e.target === companyModal) closeCompanyModal();
  });

  // Enter key on search
  fieldInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchCompanies());
  locationInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchCompanies());
}

// Load total company count
async function loadCompanyCount() {
  try {
    const response = await fetch(`${API_BASE}/companies/search?limit=1`);
    const data = await response.json();
    companyCount.textContent = data.total || 0;
  } catch (err) {
    console.error('Failed to load company count:', err);
    companyCount.textContent = '500+'; // Fallback
  }
}

// Search companies
async function searchCompanies() {
  const field = fieldInput.value.trim();
  const location = locationInput.value.trim();

  if (!field && !location) {
    alert('Please enter a field of study or location');
    return;
  }

  try {
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    const params = new URLSearchParams();
    if (field) params.append('field', field);
    if (location) params.append('location', location);
    params.append('limit', 20);

    const response = await fetch(`${API_BASE}/companies/search?${params}`);
    const data = await response.json();

    currentCompanies = data.companies || [];
    displayCompanies(currentCompanies);

    if (resultsSection.classList.contains('hidden')) {
      resultsSection.classList.remove('hidden');
      herοSection.style.display = 'none';
    }

    // Scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  } catch (err) {
    console.error('Search failed:', err);
    alert('Failed to search companies. Try again.');
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search Companies';
  }
}

// Display companies
function displayCompanies(companies) {
  if (companies.length === 0) {
    companyGrid.innerHTML = '<p>No companies found. Try different search criteria.</p>';
    return;
  }

  companyGrid.innerHTML = companies.map(company => `
    <div class="company-card" onclick="viewCompanyDetails('${company.id}')">
      <h3>${escapeHtml(company.name)}</h3>
      <p><strong>Industry:</strong> ${escapeHtml(company.industry || 'N/A')}</p>
      <p><strong>H-1B Petitions:</strong> ${company.h1b_petitions_filed || 0}</p>
      <p><strong>Approval Rate:</strong> ${company.approval_rate ? company.approval_rate.toFixed(1) + '%' : 'N/A'}</p>
      <p><strong>Avg Salary:</strong> $${company.average_salary ? company.average_salary.toLocaleString() : 'N/A'}</p>
      
      <div class="trust-score">
        <div class="trust-ring ${getTrustBadge(company.trust_score).class}">
          ${company.trust_score || 0}
        </div>
        <div>
          <strong>${getTrustBadge(company.trust_score).label}</strong>
          <p>${getTrustBadge(company.trust_score).description}</p>
        </div>
      </div>
      
      ${currentUser ? `<button class="btn btn-save" onclick="saveCompany('${company.id}', event)">Save Company</button>` : ''}
    </div>
  `).join('');
}

// Get trust badge info
function getTrustBadge(score) {
  if (score >= 8) {
    return { class: 'excellent', label: 'Excellent', description: 'Highly reliable' };
  } else if (score >= 6) {
    return { class: 'good', label: 'Good', description: 'Generally trustworthy' };
  } else if (score >= 4) {
    return { class: 'risky', label: 'Risky', description: 'Proceed with caution' };
  } else {
    return { class: 'avoid', label: 'Avoid', description: 'High risk' };
  }
}

// View company details
async function viewCompanyDetails(companyId) {
  try {
    const response = await fetch(`${API_BASE}/companies/${companyId}`);
    const company = await response.json();

    const jobsHtml = company.recentJobs && company.recentJobs.length > 0
      ? `<h4>Recent Job Listings</h4>` + company.recentJobs.map(job => `
          <div style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-primary); border-radius: 8px;">
            <h5>${escapeHtml(job.title)}</h5>
            <p>${escapeHtml(job.location)} | ${job.salary_min ? '$' + job.salary_min.toLocaleString() : 'N/A'} - ${job.salary_max ? '$' + job.salary_max.toLocaleString() : 'N/A'}</p>
            <a href="${job.apply_url}" target="_blank" class="btn btn-sm btn-primary">Apply on ${job.job_board}</a>
          </div>
        `).join('')
      : '<p>No recent job listings found.</p>';

    const applicationLinksHtml = `
      <div style="margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, rgba(79, 142, 247, 0.1) 0%, rgba(79, 142, 247, 0.05) 100%); border-radius: 8px; border-left: 4px solid #4f8ef7;">
        <h4 style="margin-top: 0; color: #4f8ef7;">📋 Apply Now</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          ${company.career_page_url ? `<a href="${company.career_page_url}" target="_blank" class="btn btn-primary" style="text-align: center; text-decoration: none;">🌐 Career Page</a>` : ''}
          ${company.linkedin_jobs_url ? `<a href="${company.linkedin_jobs_url}" target="_blank" class="btn btn-primary" style="text-align: center; text-decoration: none;">💼 LinkedIn Jobs</a>` : ''}
          ${company.indeed_company_url ? `<a href="${company.indeed_company_url}" target="_blank" class="btn btn-primary" style="text-align: center; text-decoration: none;">🔍 Indeed Company</a>` : ''}
        </div>
      </div>
    `;

    companyDetails.innerHTML = `
      <h2>${escapeHtml(company.name)}</h2>
      <p><strong>Industry:</strong> ${escapeHtml(company.industry || 'N/A')}</p>
      <p><strong>H-1B Petitions Filed (Last Year):</strong> ${company.h1b_petitions_filed || 0}</p>
      <p><strong>Approval Rate:</strong> ${company.approval_rate ? company.approval_rate.toFixed(1) + '%' : 'N/A'}</p>
      <p><strong>Denial Rate:</strong> ${company.denial_rate ? company.denial_rate.toFixed(1) + '%' : 'N/A'}</p>
      <p><strong>Average Salary:</strong> $${company.average_salary ? company.average_salary.toLocaleString() : 'N/A'}</p>
      <p><strong>Wage Level:</strong> ${company.wage_level || 'N/A'}</p>
      <p><strong>Sponsors Green Cards:</strong> ${company.sponsors_green_cards ? 'Yes' : 'No'}</p>
      
      ${applicationLinksHtml}
      
      <div style="margin-top: 2rem;">
        ${jobsHtml}
      </div>
    `;

    companyModal.classList.add('active');
  } catch (err) {
    console.error('Failed to load company details:', err);
    alert('Failed to load company details.');
  }
}

function closeCompanyModal() {
  companyModal.classList.remove('active');
}

// Save company
async function saveCompany(companyId, event) {
  event.stopPropagation();

  if (!currentUser) {
    alert('Please login to save companies');
    toggleAuthModal();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/companies/${companyId}/save`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('h1b_token')}`,
        'X-User-Id': currentUser.id
      }
    });

    if (response.ok) {
      alert('Company saved! ✅');
    }
  } catch (err) {
    console.error('Failed to save company:', err);
  }
}

// Auth Modal
function toggleAuthModal() {
  authModal.classList.toggle('active');
}

function closeAuthModal() {
  authModal.classList.remove('active');
}

// Handle Auth (Login/Register)
async function handleAuth(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert('Please fill in all fields');
    return;
  }

  try {
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Auth failed');
      return;
    }

    // Save token and user
    localStorage.setItem('h1b_token', data.token);
    localStorage.setItem('h1b_user', JSON.stringify(data));
    currentUser = data;

    updateAuthUI();
    closeAuthModal();
    alert(isLoginMode ? 'Login successful!' : 'Account created! Welcome!');
  } catch (err) {
    console.error('Auth error:', err);
    alert('Authentication failed');
  }
}

function updateAuthUI() {
  if (currentUser) {
    authBtn.textContent = 'Logout';
    authBtn.onclick = logout;
  } else {
    authBtn.textContent = 'Login';
    authBtn.onclick = toggleAuthModal;
  }
}

function logout() {
  localStorage.removeItem('h1b_token');
  localStorage.removeItem('h1b_user');
  currentUser = null;
  updateAuthUI();
  alert('Logged out');
}

// Utilities
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toggle auth mode
document.addEventListener('DOMContentLoaded', () => {
  const toggleLink = document.querySelector('.toggle-auth a');
  if (toggleLink) {
    toggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      authTitle.textContent = isLoginMode ? 'Login' : 'Create Account';
      document.querySelector('.modal button[type="submit"]').textContent = isLoginMode ? 'Login' : 'Sign Up';
    });
  }
});
