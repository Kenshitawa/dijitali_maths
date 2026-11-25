/**
 * Dijitali Maths — Admin Portal Client
 */
const state = {
  user: null,
  csrfToken: '',
  currentTab: 'dashboard',
  inboxType: 'contact',
  inboxStatus: 'all',
  inboxSearch: '',
  selectedImages: new Set(),
  sessionIdleMinutes: 10,
};

let inactivityTimer = null;
let lastActivityHeartbeatAt = 0;

document.addEventListener('DOMContentLoaded', () => {
  initThemeControls();
  initPasswordToggles();
  initAuthForms();
  initShellNav();
  initSessionActivityTracking();
  checkSession();
});

function setAdminTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  document.documentElement.classList.toggle('dark', isDark);
  // React-owned toggles handle their own state; skip them here so a click is
  // not processed twice.
  document.querySelectorAll('[data-theme-toggle]:not([data-bui-theme])').forEach((button) => {
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('aria-pressed', String(isDark));
    button.innerHTML = `<i class="fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}" aria-hidden="true"></i>`;
  });
}

function initThemeControls() {
  const savedTheme = localStorage.getItem('dm-admin-theme');
  const theme =
    savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

  setAdminTheme(theme);
  document.querySelectorAll('[data-theme-toggle]:not([data-bui-theme])').forEach((button) => {
    button.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
      localStorage.setItem('dm-admin-theme', nextTheme);
      setAdminTheme(nextTheme);
    });
  });
}

function initPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    const inputId = button.dataset.passwordToggle;
    const input = inputId ? document.getElementById(inputId) : null;
    const icon = button.querySelector('i');
    // BoardUI-rendered toggles use SVG icons and handle their own state.
    if (button.hasAttribute('data-bui-toggle')) return;
    if (!(input instanceof HTMLInputElement) || !icon) return;

    button.addEventListener('click', () => {
      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      button.setAttribute('aria-label', `${showPassword ? 'Hide' : 'Show'} password`);
      button.setAttribute('aria-pressed', String(showPassword));
      icon.classList.toggle('fa-eye', !showPassword);
      icon.classList.toggle('fa-eye-slash', showPassword);
    });
  });
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Per-page landing dashboards: each list renderer drops this mount at the top
 * of its markup and dispatches its data so the React chart header can render. */
const INSIGHTS_MOUNT = '<div id="boardui-page-insights"></div>';

function dispatchPageData(tab, items, extra) {
  window.dispatchEvent(
    new CustomEvent('admin:page-data', { detail: { tab, items: items || [], extra } })
  );
}

function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

async function api(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (opts.method && !['GET', 'HEAD'].includes(opts.method.toUpperCase()) && state.csrfToken) {
    headers['X-CSRF-Token'] = state.csrfToken;
  }
  const tracksProgress = opts.method && !['GET', 'HEAD'].includes(opts.method.toUpperCase());
  if (tracksProgress) dispatchAdminProgress({ active: true, label: 'Saving your changes' });
  try {
    const res = await fetch(url, { ...opts, headers, credentials: 'same-origin' });
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/csv')) {
      if (!res.ok) throw new Error('Export failed');
      return res.text();
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && state.user) {
      endAdminSession(data.error || 'Session expired. Please sign in again.');
      throw new Error(data.error || 'Session expired. Please sign in again.');
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } finally {
    if (tracksProgress) dispatchAdminProgress({ active: false });
  }
}

function dispatchAdminProgress(detail) {
  window.dispatchEvent(new CustomEvent('admin:progress', { detail }));
}

function apiWithProgress(url, opts) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = opts.method || 'POST';
    const headers = { ...(opts.headers || {}) };
    if (state.csrfToken) headers['X-CSRF-Token'] = state.csrfToken;
    xhr.open(method, url);
    xhr.withCredentials = true;
    xhr.timeout = 120_000;
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    dispatchAdminProgress({ active: true, label: 'Uploading files', progress: 0 });
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      opts.onProgress?.(progress);
      dispatchAdminProgress({ active: true, label: 'Uploading files', progress });
    });
    xhr.addEventListener('load', () => {
      let data = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        reject(new Error('The server returned an invalid upload response.'));
        return;
      }
      if (xhr.status === 401 && state.user) {
        endAdminSession(data.error || 'Session expired. Please sign in again.');
        reject(new Error(data.error || 'Session expired. Please sign in again.'));
      } else if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data.error || `Upload failed (${xhr.status})`));
      } else {
        resolve(data);
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed because the network connection was interrupted.')));
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out. Please try again.')));
    xhr.addEventListener('loadend', () => dispatchAdminProgress({ active: false }));
    xhr.send(opts.body);
  });
}

function isEditorOrAdmin() {
  return state.user && (state.user.role === 'admin' || state.user.role === 'editor');
}
function isAdmin() {
  return state.user && state.user.role === 'admin';
}

/* ==================== AUTH ==================== */

async function checkSession() {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get('resetToken');
  const inviteToken = params.get('inviteToken');

  if (resetToken || inviteToken) {
    showAuthView();
    document.getElementById('legacyLoginForm')?.classList.add('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
    const tf = document.getElementById('tokenPasswordForm');
    document.getElementById('legacyForms')?.removeAttribute('hidden');
    tf.classList.remove('hidden');
    document.getElementById('tokenFormTitle').textContent = inviteToken
      ? 'Activate Your Admin Account'
      : 'Set New Password';
    tf.dataset.mode = inviteToken ? 'invite' : 'reset';
    tf.dataset.token = inviteToken || resetToken;
    return;
  }

  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    state.csrfToken = data.csrfToken;
    state.sessionIdleMinutes = data.sessionIdleMinutes || 10;
    showAdminShell();
  } catch {
    showAuthView();
  }
}

function showAuthView() {
  clearTimeout(inactivityTimer);
  document.getElementById('authView').classList.remove('hidden');
  document.getElementById('adminShell').classList.add('hidden');
  window.dispatchEvent(new CustomEvent('admin:user', { detail: null }));
}

function showAdminShell() {
  document.getElementById('authView')?.classList.add('hidden');
  document.getElementById('adminShell')?.classList.remove('hidden');
  const roleBadge = document.getElementById('userRoleBadge');
  if (roleBadge) roleBadge.textContent = state.user.role.toUpperCase();
  const userDisplay = document.getElementById('currentUserDisplay');
  if (userDisplay) userDisplay.textContent = `${state.user.name} (${state.user.email})`;
  lastActivityHeartbeatAt = Date.now();
  window.dispatchEvent(new CustomEvent('admin:user', { detail: state.user }));

  document.querySelectorAll('.admin-only').forEach((el) => {
    el.classList.toggle('hidden', !isAdmin());
  });
  startAdminInactivityTimer();
  loadTab(state.currentTab);
}

function initSessionActivityTracking() {
  const recordActivity = () => {
    if (!state.user) return;
    startAdminInactivityTimer();
    const now = Date.now();
    if (now - lastActivityHeartbeatAt < 60_000) return;
    lastActivityHeartbeatAt = now;
    api('/api/auth/activity', { method: 'POST' }).catch((error) => {
      if (state.user) {
        console.error('[admin] Session activity refresh failed:', error);
        toast('Your session could not be refreshed. Please check your connection.', 'error');
      }
    });
  };
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach((eventName) =>
    document.addEventListener(eventName, recordActivity, { passive: true })
  );
}

function startAdminInactivityTimer() {
  clearTimeout(inactivityTimer);
  if (!lastActivityHeartbeatAt) lastActivityHeartbeatAt = Date.now();
  inactivityTimer = setTimeout(() => {
    api('/api/auth/logout', { method: 'POST' })
      .catch((error) => {
        if (state.user) console.error('[admin] Inactivity logout request failed:', error);
      })
      .finally(() => endAdminSession(`You were signed out after ${state.sessionIdleMinutes} minutes of inactivity.`));
  }, state.sessionIdleMinutes * 60_000);
}

function endAdminSession(message) {
  clearTimeout(inactivityTimer);
  state.user = null;
  state.csrfToken = '';
  showAuthView();
  const status = document.querySelector('#legacyLoginForm .form-status');
  if (status && message) {
    status.textContent = message;
    status.className = 'form-status';
  }
  if (message) window.dispatchEvent(new CustomEvent('admin:auth-message', { detail: message }));
}

function initAuthForms() {
  const loginForm = document.getElementById('legacyLoginForm');
  const forgotForm = document.getElementById('forgotForm');
  const tokenForm = document.getElementById('tokenPasswordForm');

  document.getElementById('showForgotBtn')?.addEventListener('click', () => {
    loginForm?.classList.add('hidden');
    forgotForm.classList.remove('hidden');
  });
  document.getElementById('backToLoginBtn')?.addEventListener('click', () => {
    forgotForm.classList.add('hidden');
    loginForm?.classList.remove('hidden');
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = loginForm.querySelector('.form-status');
    const fd = new FormData(loginForm);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
      });
      state.user = data.user;
      state.csrfToken = data.csrfToken;
      state.sessionIdleMinutes = data.sessionIdleMinutes || 10;
      loginForm.reset();
      status.className = 'form-status';
      showAdminShell();
    } catch (err) {
      status.textContent = err.message;
      status.className = 'form-status error';
    }
  });

  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = forgotForm.querySelector('.form-status');
    const fd = new FormData(forgotForm);
    try {
      const data = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: fd.get('email') }),
      });
      status.textContent = data.message;
      status.className = 'form-status success';
    } catch (err) {
      status.textContent = err.message;
      status.className = 'form-status error';
    }
  });

  tokenForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = tokenForm.querySelector('.form-status');
    const endpoint =
      tokenForm.dataset.mode === 'invite' ? '/api/auth/accept-invite' : '/api/auth/reset-password';
    try {
      const data = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          token: tokenForm.dataset.token,
          password: document.getElementById('newPasswordInput').value,
        }),
      });
      status.textContent = data.message;
      status.className = 'form-status success';
      setTimeout(() => {
        window.history.replaceState({}, '', '/admin');
        tokenForm.classList.add('hidden');
        loginForm?.classList.remove('hidden');
      }, 1500);
    } catch (err) {
      status.textContent = err.message;
      status.className = 'form-status error';
    }
  });

  // The sign-out button is rendered by the React shell, which mounts after this
  // script runs. Bind it whenever it appears instead of assuming it exists on
  // DOMContentLoaded — an exception here used to abort initShellNav() and
  // checkSession(), leaving every navigation tab inert.
  const bindLogout = () => {
    const button = document.getElementById('logoutBtn');
    if (!button || button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
      state.user = null;
      state.csrfToken = '';
      showAuthView();
    });
  };
  bindLogout();
  new MutationObserver(bindLogout).observe(document.body, { childList: true, subtree: true });
}

/* ==================== NAVIGATION & MODAL ==================== */

function initShellNav() {
  // The sidebar and menu live in the React shell and may mount after this
  // script. Delegation keeps navigation working regardless of mount order.
  const sidebar = () => document.getElementById('adminSidebar');
  document.addEventListener('click', (event) => {
    if (event.target.closest('#adminMenuBtn')) sidebar()?.classList.add('open');
    if (event.target.closest('#adminModalClose')) document.getElementById('adminModal')?.classList.remove('open');
  });

  window.addEventListener('admin:navigate', (event) => {
    sidebar()?.classList.remove('open');
    loadTab(event.detail);
  });

  const modal = document.getElementById('adminModal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
}

function openModal(title, html) {
  document.getElementById('adminModalTitle').textContent = title;
  document.getElementById('adminModalBody').innerHTML = html;
  document.getElementById('adminModal').classList.add('open');
}
function closeModal() {
  document.getElementById('adminModal').classList.remove('open');
}

async function loadTab(tab) {
  state.currentTab = tab;
  const titles = {
    dashboard: 'Dashboard',
    inbox: 'Inbox & Submissions',
    subscribers: 'Newsletter Subscribers',
    images: 'Media Gallery',
    programs: 'Programs',
    events: 'Events',
    posts: 'Posts & Updates',
    videos: 'Videos',
    visitors: 'Visitor Analytics',
    users: 'Users & Roles',
    settings: 'Site Settings',
    audit: 'Audit Log',
  };
  document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';
  const main = document.getElementById('adminContent');
  main.innerHTML = '<div class="panel">Loading...</div>';

  try {
    if (tab === 'dashboard') await renderDashboard(main);
    else if (tab === 'inbox') await renderInbox(main);
    else if (tab === 'subscribers') await renderSubscribers(main);
    else if (tab === 'images') await renderImages(main);
    else if (tab === 'programs') await renderPrograms(main);
    else if (tab === 'events') await renderEvents(main);
    else if (tab === 'posts') await renderPosts(main);
    else if (tab === 'videos') await renderVideos(main);
    else if (tab === 'visitors') await renderVisitors(main);
    else if (tab === 'users') await renderUsers(main);
    else if (tab === 'settings') await renderSettings(main);
    else if (tab === 'audit') await renderAudit(main);
  } catch (err) {
    main.innerHTML = `<div class="panel" style="color:var(--accent-coral);">Error: ${escapeHtml(err.message)}</div>`;
  }
}

/* ==================== 1. DASHBOARD ==================== */

async function renderDashboard(el) {
  const { counts } = await api('/api/admin/dashboard');
  // The dashboard is rendered in React with BoardUI components; this function
  // stays as the data source so the page engine and auth bridge are unchanged.
  window.dispatchEvent(
    new CustomEvent('admin:dashboard-data', {
      detail: { counts, name: state.user?.name || 'there' },
    })
  );
}

/* ==================== 2. INBOX ==================== */

async function renderInbox(el) {
  // The conversation inbox is rendered in React (BoardUI). Keep this function
  // as the tab-entry point so loadTab() and the session bridge stay intact.
  el.innerHTML = '<div id="boardui-inbox-root"></div>';
  window.dispatchEvent(new CustomEvent('admin:inbox-open'));
  return;

  /* legacy table renderer retained below for reference
  el.innerHTML = `
    <div class="panel">
      <div class="toolbar">
        <div class="tab-pills">
          ${[
            ['contact', 'Contact'],
            ['volunteers', 'Volunteers'],
            ['partners', 'Partners'],
            ['events', 'Event Registrations'],
          ]
            .map(
              ([k, lbl]) =>
                `<button type="button" class="tab-pill ${state.inboxType === k ? 'active' : ''}" data-inbox-type="${k}">${lbl}</button>`
            )
            .join('')}
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <input type="search" id="inboxSearchInput" class="form-control" style="width:200px;padding:0.45rem 0.7rem;" placeholder="Search..." value="${escapeHtml(state.inboxSearch)}" />
          <select id="inboxStatusSelect" class="form-control" style="width:140px;padding:0.45rem 0.7rem;">
            ${['all', 'new', 'read', 'replied', 'archived']
              .map((s) => `<option value="${s}" ${state.inboxStatus === s ? 'selected' : ''}>${s}</option>`)
              .join('')}
          </select>
          ${isAdmin() ? `<button type="button" id="inboxExportBtn" class="btn btn-outline-primary btn-sm">Export CSV</button>` : ''}
        </div>
      </div>

      ${
        !items.length
          ? '<p style="color:var(--text-muted);padding:1rem 0;">No submissions found.</p>'
          : `<div class="table-wrap"><table class="data-table">
              <thead><tr><th>Sender</th><th>Details</th><th>Status &amp; Notes</th><th>Actions</th></tr></thead>
              <tbody>
                ${items
                  .map((item) => {
                    const summary =
                      state.inboxType === 'contact'
                        ? `<strong>${escapeHtml(item.enquiryType)}</strong><br/>${escapeHtml(item.message)}`
                        : state.inboxType === 'volunteers'
                          ? `<strong>${escapeHtml(item.county)}</strong> &bull; ${escapeHtml(item.availability)}<br/>Skills: ${escapeHtml(item.skillsJson)}<br/>${escapeHtml(item.motivation)}`
                          : state.inboxType === 'partners'
                            ? `<strong>${escapeHtml(item.partnershipType)}</strong> (${escapeHtml(item.organization || 'Individual')}) ${escapeHtml(item.amountLabel || '')}<br/>${escapeHtml(item.message)}`
                            : `<strong>${escapeHtml(item.eventTitle)}</strong><br/>Role: ${escapeHtml(item.roleType)}`;
                    const mailSubject = encodeURIComponent(`Re: Dijitali Maths (${state.inboxType})`);
                    return `
                      <tr data-id="${escapeHtml(item.id)}">
                        <td>
                          <strong>${escapeHtml(item.name)}</strong><br/>
                          <small>${escapeHtml(item.email)}</small><br/>
                          <small>${escapeHtml(item.phone || '')}</small><br/>
                          <small style="color:var(--text-muted);">${new Date(item.createdAt).toLocaleString()}</small>
                        </td>
                        <td style="max-width:340px;">${summary}</td>
                        <td>
                          <select class="form-control inbox-status-sel" style="padding:0.35rem;margin-bottom:0.4rem;" ${!isEditorOrAdmin() ? 'disabled' : ''}>
                            ${['new', 'read', 'replied', 'archived']
                              .map((s) => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`)
                              .join('')}
                          </select>
                          <input type="text" class="form-control inbox-notes-inp" style="padding:0.35rem;" placeholder="Internal notes..." value="${escapeHtml(item.notes || '')}" ${!isEditorOrAdmin() ? 'disabled' : ''} />
                        </td>
                        <td>
                          <div style="display:flex;flex-direction:column;gap:0.35rem;">
                            <a href="mailto:${escapeHtml(item.email)}?subject=${mailSubject}" class="btn btn-outline-primary btn-sm">Reply</a>
                            ${isEditorOrAdmin() ? `<button type="button" class="btn btn-primary btn-sm inbox-save-btn">Save</button>` : ''}
                            ${isEditorOrAdmin() ? `<button type="button" class="btn btn-danger btn-sm inbox-del-btn">Delete</button>` : ''}
                          </div>
                        </td>
                      </tr>`;
                  })
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;

  el.querySelectorAll('[data-inbox-type]').forEach((b) =>
    b.addEventListener('click', () => {
      state.inboxType = b.dataset.inboxType;
      renderInbox(el);
    })
  );
  el.querySelector('#inboxStatusSelect')?.addEventListener('change', (e) => {
    state.inboxStatus = e.target.value;
    renderInbox(el);
  });
  el.querySelector('#inboxSearchInput')?.addEventListener('change', (e) => {
    state.inboxSearch = e.target.value;
    renderInbox(el);
  });
  el.querySelector('#inboxExportBtn')?.addEventListener('click', () => {
    window.location.href = `/api/admin/inbox/${state.inboxType}/export`;
  });

  el.querySelectorAll('.inbox-save-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const id = row.dataset.id;
      const status = row.querySelector('.inbox-status-sel').value;
      const notes = row.querySelector('.inbox-notes-inp').value;
      try {
        await api(`/api/admin/inbox/${state.inboxType}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status, notes }),
        });
        toast('Updated submission');
      } catch (err) {
        toast(err.message, 'error');
      }
    })
  );

  el.querySelectorAll('.inbox-del-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this submission permanently?')) return;
      const id = btn.closest('tr').dataset.id;
      try {
        await api(`/api/admin/inbox/${state.inboxType}/${id}`, { method: 'DELETE' });
        toast('Submission deleted');
        renderInbox(el);
      } catch (err) {
        toast(err.message, 'error');
      }
    })
  );
  */
}

/* ==================== 3. SUBSCRIBERS ==================== */

async function renderSubscribers(el) {
  const { items } = await api('/api/admin/subscribers');
  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    <div class="panel">
      <div class="toolbar">
        <strong>${items.length} Subscribers</strong>
        ${isAdmin() ? '<a href="/api/admin/subscribers/export" class="btn btn-outline-primary btn-sm">Export CSV</a>' : ''}
      </div>
      ${
        !items.length
          ? '<p>No subscribers yet.</p>'
          : `<div class="table-wrap"><table class="data-table">
              <thead><tr><th>Email</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                ${items
                  .map(
                    (s) => `
                  <tr data-id="${escapeHtml(s.id)}">
                    <td>${escapeHtml(s.email)}</td>
                    <td><span class="badge ${s.status === 'confirmed' ? 'badge-emerald' : 'badge-amber'}">${escapeHtml(s.status)}</span></td>
                    <td>${new Date(s.createdAt).toLocaleDateString()}</td>
                    <td>
                      ${
                        isEditorOrAdmin()
                          ? `<button type="button" class="btn btn-outline-primary btn-sm sub-unsub">Unsubscribe</button>
                             <button type="button" class="btn btn-danger btn-sm sub-del">Delete</button>`
                          : 'Read-only'
                      }
                    </td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table></div>`
      }
    </div>
  `;

  el.querySelectorAll('.sub-unsub').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      await api(`/api/admin/subscribers/${id}/unsubscribe`, { method: 'PATCH' });
      toast('Subscriber unsubscribed');
      renderSubscribers(el);
    })
  );
  el.querySelectorAll('.sub-del').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this subscriber?')) return;
      const id = btn.closest('tr').dataset.id;
      await api(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
      toast('Subscriber removed');
      renderSubscribers(el);
    })
  );
  dispatchPageData('subscribers', items);
}

/* ==================== 4. IMAGES ==================== */

async function renderImages(el) {
  const { items } = await api('/api/admin/images');
  state.selectedImages.clear();

  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    ${
      isEditorOrAdmin()
        ? `<div class="panel">
            <div class="dropzone" id="imgDropzone">
              <p><strong>Drag &amp; drop JPEG, PNG, or WebP images here</strong> or click to select multiple files</p>
              <input type="file" id="imgFileInput" multiple accept="image/jpeg,image/png,image/webp" class="hidden" />
            </div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;">
              <select id="uploadCat" class="form-control" style="width:180px;">
                <option value="learners">Learners</option>
                <option value="teachers">Teachers</option>
                <option value="community">Community</option>
                <option value="action" selected>Maths in Action</option>
                <option value="partners">Partners</option>
              </select>
              <input type="text" id="uploadAlt" class="form-control" style="flex:1;min-width:200px;" placeholder="Optional alt text / caption for batch..." />
              <progress id="uploadProgress" value="0" max="100" class="hidden" style="width:160px;"></progress>
              <span id="uploadProgressLabel" class="hidden" aria-live="polite"></span>
            </div>
          </div>`
        : ''
    }
    <div class="panel">
      <div class="toolbar">
        <strong>${items.length} Images</strong>
        ${isEditorOrAdmin() ? '<button type="button" id="bulkDeleteImgBtn" class="btn btn-danger btn-sm hidden">Delete Selected</button>' : ''}
      </div>
      <div class="admin-img-grid">
        ${items
          .map(
            (img) => `
          <div class="admin-img-card" data-id="${escapeHtml(img.id)}">
            <img src="${escapeHtml(img.thumbUrl)}" alt="${escapeHtml(img.altText)}" loading="lazy" />
            <div style="padding:0.7rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:0.4rem;">
                <span class="badge badge-blue">${escapeHtml(img.category)}</span>
                ${isEditorOrAdmin() ? `<input type="checkbox" class="img-sel-cb" aria-label="Select image" />` : ''}
              </div>
              <div style="font-size:0.84rem;font-weight:700;margin:0.4rem 0;">${escapeHtml(img.title)}</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">${img.width}x${img.height} &bull; ${(img.sizeBytes / 1024).toFixed(0)} KB</div>
              ${
                isEditorOrAdmin()
                  ? `<div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
                      <button type="button" class="btn btn-outline-primary btn-sm img-edit-btn">Edit</button>
                      <button type="button" class="btn btn-danger btn-sm img-del-btn">Delete</button>
                    </div>`
                  : ''
              }
            </div>
          </div>`
          )
          .join('')}
      </div>
    </div>
  `;

  if (isEditorOrAdmin()) {
    const dropzone = el.querySelector('#imgDropzone');
    const fileInput = el.querySelector('#imgFileInput');
    const prog = el.querySelector('#uploadProgress');

    const uploadFiles = async (fileList) => {
      if (!fileList.length) return;
      const fd = new FormData();
      for (const f of fileList) fd.append('files', f);
      fd.append('category', el.querySelector('#uploadCat').value);
      const alt = el.querySelector('#uploadAlt').value.trim();
      if (alt) fd.append('altText', alt);

      prog.classList.remove('hidden');
      const progressLabel = el.querySelector('#uploadProgressLabel');
      progressLabel.classList.remove('hidden');
      progressLabel.textContent = '0%';
      try {
        const res = await apiWithProgress('/api/admin/images', {
          method: 'POST',
          body: fd,
          onProgress: (progress) => {
            prog.value = progress;
            progressLabel.textContent = `${progress}%`;
          },
        });
        if (res.uploaded?.length) toast(`Uploaded ${res.uploaded.length} image(s)`);
        if (res.errors?.length) toast(res.errors.map((e) => e.error).join('; '), 'error');
        renderImages(el);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        prog.classList.add('hidden');
        progressLabel.classList.add('hidden');
      }
    };

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => uploadFiles(fileInput.files));
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      uploadFiles(e.dataTransfer.files);
    });

    const bulkBtn = el.querySelector('#bulkDeleteImgBtn');
    el.querySelectorAll('.img-sel-cb').forEach((cb) =>
      cb.addEventListener('change', () => {
        const id = cb.closest('.admin-img-card').dataset.id;
        if (cb.checked) state.selectedImages.add(id);
        else state.selectedImages.delete(id);
        bulkBtn.classList.toggle('hidden', state.selectedImages.size === 0);
      })
    );

    bulkBtn.addEventListener('click', async () => {
      if (!confirm(`Delete ${state.selectedImages.size} selected image(s)?`)) return;
      await api('/api/admin/images/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: [...state.selectedImages] }),
      });
      toast('Selected images deleted');
      renderImages(el);
    });

    el.querySelectorAll('.img-del-btn').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this image permanently?')) return;
        const id = btn.closest('.admin-img-card').dataset.id;
        await api(`/api/admin/images/${id}`, { method: 'DELETE' });
        toast('Image deleted');
        renderImages(el);
      })
    );

    el.querySelectorAll('.img-edit-btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        const id = btn.closest('.admin-img-card').dataset.id;
        const img = items.find((i) => i.id === id);
        openModal(
          'Edit Image',
          `<form id="editImgForm">
            <div class="form-group"><label class="form-label">Title</label><input name="title" class="form-control" value="${escapeHtml(img.title)}" required /></div>
            <div class="form-group"><label class="form-label">Alt Text / Caption</label><input name="altText" class="form-control" value="${escapeHtml(img.altText)}" required /></div>
            <div class="form-group"><label class="form-label">Category</label>
              <select name="category" class="form-control">
                ${['learners', 'teachers', 'community', 'action', 'partners']
                  .map((c) => `<option value="${c}" ${img.category === c ? 'selected' : ''}>${c}</option>`)
                  .join('')}
              </select>
            </div>
            <div class="form-group"><label class="form-label">Sort Order</label><input type="number" name="sortOrder" class="form-control" value="${img.sortOrder}" /></div>
            <div class="form-group"><label><input type="checkbox" name="published" ${img.published ? 'checked' : ''} /> Published in Public Gallery</label></div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Save Changes</button>
          </form>`
        );
        document.getElementById('editImgForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await api(`/api/admin/images/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              title: fd.get('title'),
              altText: fd.get('altText'),
              category: fd.get('category'),
              sortOrder: Number(fd.get('sortOrder')),
              published: fd.get('published') === 'on',
            }),
          });
          closeModal();
          toast('Image updated');
          renderImages(el);
        });
      })
    );
  }
  dispatchPageData('images', items);
}

/* ==================== 5-8. PROGRAMS, EVENTS, POSTS, VIDEOS ==================== */

async function renderPrograms(el) {
  const { items } = await api('/api/admin/programs');
  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    <div class="panel">
      <div class="toolbar">
        <strong>${items.length} Programs</strong>
        ${isEditorOrAdmin() ? '<button type="button" id="addProgBtn" class="btn btn-primary btn-sm">Add Program</button>' : ''}
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${items
            .map(
              (p) => `
            <tr data-id="${escapeHtml(p.id)}">
              <td><strong>${escapeHtml(p.title)}</strong><br/><small>${escapeHtml(p.slug)}</small></td>
              <td>${escapeHtml(p.categoryLabel)}</td>
              <td><span class="badge ${p.status === 'published' ? 'badge-emerald' : 'badge-amber'}">${escapeHtml(p.status)}</span></td>
              <td>
                ${
                  isEditorOrAdmin()
                    ? `<button type="button" class="btn btn-danger btn-sm prog-del">Delete</button>`
                    : 'Read-only'
                }
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table></div>
    </div>
  `;

  el.querySelector('#addProgBtn')?.addEventListener('click', () => {
    openModal(
      'New Program',
      `<form id="newProgForm">
        <div class="form-group"><label class="form-label">Slug (lowercase-hyphens)</label><input name="slug" class="form-control" required pattern="[a-z0-9-]+" /></div>
        <div class="form-group"><label class="form-label">Title</label><input name="title" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Category Label</label><input name="categoryLabel" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Summary</label><textarea name="summary" class="form-control" required></textarea></div>
        <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="form-control" required></textarea></div>
        <div class="form-group"><label class="form-label">Status</label><select name="status" class="form-control"><option value="published">published</option><option value="draft">draft</option></select></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Create Program</button>
      </form>`
    );
    document.getElementById('newProgForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await api('/api/admin/programs', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(fd.entries())),
      });
      closeModal();
      toast('Program created');
      renderPrograms(el);
    });
  });

  el.querySelectorAll('.prog-del').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this program?')) return;
      await api(`/api/admin/programs/${b.closest('tr').dataset.id}`, { method: 'DELETE' });
      toast('Program deleted');
      renderPrograms(el);
    })
  );
  dispatchPageData('programs', items);
}

async function renderEvents(el) {
  const { items } = await api('/api/admin/events');
  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    <div class="panel">
      <div class="toolbar">
        <strong>${items.length} Events</strong>
        ${isEditorOrAdmin() ? '<button type="button" id="addEvBtn" class="btn btn-primary btn-sm">Add Event</button>' : ''}
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Event</th><th>Date &amp; Location</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${items
            .map(
              (ev) => `
            <tr data-id="${escapeHtml(ev.id)}">
              <td><strong>${escapeHtml(ev.title)}</strong><br/><small>${escapeHtml(ev.category)}</small></td>
              <td>${escapeHtml(ev.eventDateLabel)} &bull; ${escapeHtml(ev.location)}</td>
              <td><span class="badge ${ev.status === 'published' ? 'badge-emerald' : 'badge-amber'}">${escapeHtml(ev.status)}</span></td>
              <td>${isEditorOrAdmin() ? '<button type="button" class="btn btn-danger btn-sm ev-del">Delete</button>' : 'Read-only'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table></div>
    </div>
  `;

  el.querySelector('#addEvBtn')?.addEventListener('click', () => {
    openModal(
      'New Event',
      `<form id="newEvForm">
        <div class="form-group"><label class="form-label">Slug</label><input name="slug" class="form-control" required pattern="[a-z0-9-]+" /></div>
        <div class="form-group"><label class="form-label">Title</label><input name="title" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Category</label><select name="category" class="form-control"><option value="festival">festival</option><option value="camp">camp</option><option value="workshop">workshop</option><option value="webinar">webinar</option></select></div>
        <div class="form-group"><label class="form-label">Date Label (e.g. 18 Oct)</label><input name="eventDateLabel" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Location</label><input name="location" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Audience</label><input name="audience" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Schedule</label><input name="schedule" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="form-control" required></textarea></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Create Event</button>
      </form>`
    );
    document.getElementById('newEvForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await api('/api/admin/events', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())),
      });
      closeModal();
      toast('Event created');
      renderEvents(el);
    });
  });

  el.querySelectorAll('.ev-del').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return;
      await api(`/api/admin/events/${b.closest('tr').dataset.id}`, { method: 'DELETE' });
      toast('Event deleted');
      renderEvents(el);
    })
  );
  dispatchPageData('events', items);
}

async function renderPosts(el) {
  const { items } = await api('/api/admin/posts');
  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    <div class="panel">
      <div class="toolbar">
        <strong>${items.length} Posts</strong>
        ${isEditorOrAdmin() ? '<button type="button" id="addPostBtn" class="btn btn-primary btn-sm">New Post</button>' : ''}
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Title</th><th>Status</th><th>Author</th><th>Actions</th></tr></thead>
        <tbody>
          ${items
            .map(
              (p) => `
            <tr data-id="${escapeHtml(p.id)}">
              <td><strong>${escapeHtml(p.title)}</strong><br/><small>${escapeHtml(p.excerpt)}</small></td>
              <td><span class="badge ${p.status === 'published' ? 'badge-emerald' : 'badge-amber'}">${escapeHtml(p.status)}</span></td>
              <td>${escapeHtml(p.authorName)}</td>
              <td>${isEditorOrAdmin() ? '<button type="button" class="btn btn-danger btn-sm post-del">Delete</button>' : 'Read-only'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table></div>
    </div>
  `;

  el.querySelector('#addPostBtn')?.addEventListener('click', () => {
    openModal(
      'New Post',
      `<form id="newPostForm">
        <div class="form-group"><label class="form-label">Slug</label><input name="slug" class="form-control" required pattern="[a-z0-9-]+" /></div>
        <div class="form-group"><label class="form-label">Title</label><input name="title" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Excerpt</label><textarea name="excerpt" class="form-control" required></textarea></div>
        <div class="form-group"><label class="form-label">Content (HTML)</label><textarea name="contentHtml" class="form-control" required></textarea></div>
        <div class="form-group"><label class="form-label">Status</label><select name="status" class="form-control"><option value="published">published</option><option value="draft">draft</option></select></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Save Post</button>
      </form>`
    );
    document.getElementById('newPostForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await api('/api/admin/posts', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())),
      });
      closeModal();
      toast('Post saved');
      renderPosts(el);
    });
  });

  el.querySelectorAll('.post-del').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return;
      await api(`/api/admin/posts/${b.closest('tr').dataset.id}`, { method: 'DELETE' });
      toast('Post deleted');
      renderPosts(el);
    })
  );
  dispatchPageData('posts', items);
}

async function renderVideos(el) {
  const { items } = await api('/api/admin/videos');
  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    <div class="panel">
      <div class="toolbar">
        <strong>${items.length} Videos</strong>
        ${isEditorOrAdmin() ? '<button type="button" id="addVidBtn" class="btn btn-primary btn-sm">Add Video</button>' : ''}
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Title</th><th>Category</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${items
            .map(
              (v) => `
            <tr data-id="${escapeHtml(v.id)}">
              <td><strong>${escapeHtml(v.title)}</strong><br/><small>${escapeHtml(v.description)}</small></td>
              <td>${escapeHtml(v.category)}</td>
              <td>${v.videoUrl ? 'Uploaded file' : 'YouTube'}</td>
              <td><span class="badge ${v.status === 'published' ? 'badge-emerald' : 'badge-amber'}">${escapeHtml(v.status)}</span></td>
              <td>${isEditorOrAdmin() ? '<button type="button" class="btn btn-danger btn-sm vid-del">Delete</button>' : 'Read-only'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table></div>
    </div>
  `;

  el.querySelector('#addVidBtn')?.addEventListener('click', () => {
    openModal(
      'New Video',
      `<form id="newVidForm">
        <div class="form-group"><label class="form-label">Title</label><input name="title" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Category</label><input name="category" class="form-control" value="Learner Session" required /></div>
        <div class="form-group"><label class="form-label">YouTube URL</label><input name="youtubeUrl" class="form-control" /></div>
        <div class="form-group"><label class="form-label">Or upload MP4 / WebM</label><input name="video" type="file" class="form-control" accept=".mp4,.webm,video/mp4,video/webm" /></div>
        <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="form-control" required></textarea></div>
        <div class="form-group"><label class="form-label">Visibility</label><select name="status" class="form-control"><option value="published">Published</option><option value="draft">Draft</option></select></div>
        <p class="settings-help">Uploaded videos are stored in <code>uploads/videos</code>. Published videos appear on the public Videos page. Default file limit: 100 MB.</p>
        <progress id="videoUploadProgress" value="0" max="100" class="hidden" style="width:100%;"></progress>
        <span id="videoUploadProgressLabel" class="hidden" aria-live="polite"></span>
        <button type="submit" class="btn btn-primary" style="width:100%;">Save Video</button>
      </form>`
    );
    document.getElementById('newVidForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const file = formData.get('video');
      const youtubeUrl = String(formData.get('youtubeUrl') || '').trim();
      const isFileUpload = file instanceof File && file.size > 0;
      if (isFileUpload && youtubeUrl) {
        toast('Choose either a YouTube URL or a video file, not both.', 'error');
        return;
      }

      const progress = document.getElementById('videoUploadProgress');
      const progressLabel = document.getElementById('videoUploadProgressLabel');
      try {
        if (isFileUpload) {
          progress.classList.remove('hidden');
          progressLabel.classList.remove('hidden');
          progressLabel.textContent = '0%';
          await apiWithProgress('/api/admin/videos/upload', {
            method: 'POST',
            body: formData,
            onProgress: (percentage) => {
              progress.value = percentage;
              progressLabel.textContent = `${percentage}%`;
            },
          });
        } else {
          if (!youtubeUrl) {
            toast('Enter a YouTube URL or choose an MP4/WebM video.', 'error');
            return;
          }
          const payload = Object.fromEntries([...formData.entries()].filter(([key, value]) => key !== 'video' && typeof value === 'string'));
          await api('/api/admin/videos', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal();
        toast('Video saved');
        renderVideos(el);
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        progress.classList.add('hidden');
        progressLabel.classList.add('hidden');
      }
    });
  });

  el.querySelectorAll('.vid-del').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Delete this video?')) return;
      await api(`/api/admin/videos/${b.closest('tr').dataset.id}`, { method: 'DELETE' });
      toast('Video deleted');
      renderVideos(el);
    })
  );
  dispatchPageData('videos', items);
}

/* ==================== 9. VISITORS ==================== */

async function renderVisitors(el) {
  const data = await api('/api/admin/visitors?days=30');

  el.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-val">${data.totalVisits}</div><div class="kpi-lbl">Total Pageviews (30d)</div></div>
      <div class="kpi-card"><div class="kpi-val">${data.uniqueVisitors}</div><div class="kpi-lbl">Estimated Unique Visitors (30d)</div></div>
    </div>
    <div id="visitorCharts"></div>
  `;

  window.dispatchEvent(new CustomEvent('admin:visitors-data', { detail: data }));
}

/* ==================== 10. USERS ==================== */

async function renderUsers(el) {
  const { items } = await api('/api/admin/users');
  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    <div class="panel">
      <div class="toolbar">
        <strong>${items.length} Users</strong>
        <button type="button" id="inviteUserBtn" class="btn btn-primary btn-sm">Invite User</button>
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${items
            .map(
              (u) => `
            <tr data-id="${escapeHtml(u.id)}">
              <td><strong>${escapeHtml(u.name)}</strong><br/><small>${escapeHtml(u.email)}</small></td>
              <td>
                <select class="form-control user-role-sel" style="width:120px;padding:0.3rem;">
                  ${['admin', 'editor', 'viewer']
                    .map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`)
                    .join('')}
                </select>
              </td>
              <td>${u.isActive ? '<span class="badge badge-emerald">Active</span>' : '<span class="badge badge-amber">Inactive / Pending</span>'}</td>
              <td>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                  <button type="button" class="btn btn-outline-primary btn-sm user-toggle-btn">${u.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button type="button" class="btn btn-outline-primary btn-sm user-reset-btn">Reset PW</button>
                  <button type="button" class="btn btn-danger btn-sm user-del-btn">Remove</button>
                </div>
              </td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table></div>
    </div>
  `;

  el.querySelector('#inviteUserBtn').addEventListener('click', () => {
    openModal(
      'Invite Team Member',
      `<form id="inviteForm">
        <div class="form-group"><label class="form-label">Full Name</label><input name="name" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" class="form-control" required /></div>
        <div class="form-group"><label class="form-label">Role</label><select name="role" class="form-control"><option value="editor">editor</option><option value="viewer">viewer</option><option value="admin">admin</option></select></div>
        <button type="submit" class="btn btn-primary" style="width:100%;">Send Invite</button>
        <div id="inviteLinkOut" style="margin-top:0.75rem;word-break:break-all;"></div>
      </form>`
    );
    document.getElementById('inviteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await api('/api/admin/users/invite', {
          method: 'POST',
          body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())),
        });
        toast('User invited');
        if (res.inviteUrl) {
          document.getElementById('inviteLinkOut').innerHTML =
            `<small>SMTP not configured. Share this one-time setup link:</small><br/><code>${escapeHtml(res.inviteUrl)}</code>`;
        } else {
          closeModal();
          renderUsers(el);
        }
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });

  el.querySelectorAll('.user-role-sel').forEach((sel) =>
    sel.addEventListener('change', async () => {
      const id = sel.closest('tr').dataset.id;
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role: sel.value }) });
      toast('Role updated');
    })
  );
  el.querySelectorAll('.user-toggle-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      const isActive = btn.textContent === 'Activate';
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
      toast('User status updated');
      renderUsers(el);
    })
  );
  el.querySelectorAll('.user-reset-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      const res = await api(`/api/admin/users/${id}/reset-password`, { method: 'POST' });
      toast(res.resetUrl ? `Reset link: ${res.resetUrl}` : 'Password reset email sent');
    })
  );
  el.querySelectorAll('.user-del-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this user permanently?')) return;
      const id = btn.closest('tr').dataset.id;
      await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      toast('User removed');
      renderUsers(el);
    })
  );
  dispatchPageData('users', items);
}

/* ==================== 11. SITE SETTINGS ==================== */

async function renderSettings(el) {
  const [{ settings }, { history }, { items: payments }] = await Promise.all([
    api('/api/admin/settings'),
    api('/api/admin/settings/history'),
    api('/api/admin/donation-payments'),
  ]);

  const fields = [
    ['organizationName', 'Organization Name'],
    ['tagline', 'Tagline'],
    ['contactEmail', 'Contact Email'],
    ['contactPhone', 'Contact Phone'],
    ['whatsappUrl', 'WhatsApp URL'],
    ['mpesaPaybill', 'M-Pesa Paybill (Flagged: verify live vs sandbox 174379)'],
    ['mpesaAccountName', 'M-Pesa Account Name'],
    ['donationAmounts', 'Suggested donation amounts (KES, comma-separated)'],
    ['bankName', 'Bank Name'],
    ['bankAccountNumber', 'Bank Account Number'],
    ['bankAccountName', 'Bank Account Name'],
    ['bankBranch', 'Bank Branch'],
  ];

  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    <div class="panel">
      <h3>Site Settings</h3>
      <p class="settings-help">These payment details and suggested amounts appear on the public donation page. Use whole KES values separated by commas.</p>
      <form id="settingsForm" style="margin-top:1rem;">
        ${fields
          .map(
            ([k, lbl]) => `
          <div class="form-group">
            <label class="form-label">${escapeHtml(lbl)}</label>
            <input name="${escapeHtml(k)}" class="form-control" value="${escapeHtml(Array.isArray(settings[k]) ? settings[k].join(', ') : settings[k] || (k === 'donationAmounts' ? '500, 1000, 2500, 5000, 10000' : ''))}" ${!isAdmin() ? 'disabled' : ''} />
          </div>`
          )
          .join('')}
        ${isAdmin() ? '<button type="submit" class="btn btn-primary">Save Settings</button>' : ''}
      </form>
    </div>
    <div class="panel">
      <div class="toolbar">
        <div>
          <h3>M-Pesa Express</h3>
          <p class="settings-help">${settings.mpesaStkEnabled ? 'STK Push is configured and available.' : 'STK Push is not configured. Add Daraja credentials and a public HTTPS callback URL to the server environment.'}</p>
        </div>
        <span class="badge ${settings.mpesaStkEnabled ? 'badge-emerald' : 'badge-amber'}">${settings.mpesaStkEnabled ? 'Available' : 'Needs setup'}</span>
      </div>
      <p class="settings-help">Payment requests and confirmations are listed below. Only the last four phone digits are retained.</p>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Date</th><th>Amount</th><th>Phone ending</th><th>Status</th><th>M-Pesa receipt</th></tr></thead>
        <tbody>
          ${payments.length ? payments.map((payment) => `
            <tr>
              <td>${new Date(payment.createdAt).toLocaleString()}</td>
              <td>KES ${Number(payment.amount).toLocaleString('en-KE')}</td>
              <td>••${escapeHtml(payment.phoneLastFour)}</td>
              <td><span class="badge ${payment.status === 'completed' ? 'badge-emerald' : payment.status === 'failed' ? 'badge-amber' : 'badge-blue'}">${escapeHtml(payment.status)}</span></td>
              <td>${escapeHtml(payment.mpesaReceiptNumber || payment.resultDescription || 'Waiting for M-Pesa')}</td>
            </tr>`).join('') : '<tr><td colspan="5">No M-Pesa Express payments yet.</td></tr>'}
        </tbody>
      </table></div>
    </div>
    <div class="panel">
      <h3>Recent Setting Changes</h3>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Key</th><th>Changed By</th><th>Date</th></tr></thead>
        <tbody>
          ${history
            .slice(0, 20)
            .map(
              (h) => `<tr><td>${escapeHtml(h.key)}</td><td>${escapeHtml(h.changedBy)}</td><td>${new Date(h.createdAt).toLocaleString()}</td></tr>`
            )
            .join('')}
        </tbody>
      </table></div>
    </div>
  `;

  el.querySelector('#settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(payload) });
      toast('Settings saved');
      renderSettings(el);
    } catch (error) {
      toast(error.message, 'error');
    }
  });
  dispatchPageData('settings', [], { settings, history, payments });
}

/* ==================== 12. AUDIT LOG ==================== */

async function renderAudit(el) {
  const { items } = await api('/api/admin/audit-logs');
  const recent = items.slice(0, 5);
  const archived = items.slice(5);
  const auditRow = (a) => `
    <tr>
      <td>${new Date(a.createdAt).toLocaleString()}</td>
      <td>${escapeHtml(a.userEmail)}</td>
      <td><code>${escapeHtml(a.action)}</code></td>
      <td>${escapeHtml(a.entityType || '')} ${escapeHtml(a.entityId || '')}</td>
    </tr>`;
  const auditTable = (rows) => `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th></tr></thead>
      <tbody>${rows.map(auditRow).join('')}</tbody>
    </table></div>`;

  el.innerHTML = `
    ${INSIGHTS_MOUNT}
    <div class="panel">
      <div class="toolbar">
        <div>
          <h3>Recent activity</h3>
          <p class="settings-help">The five most recent admin actions. Older entries are archived below.</p>
        </div>
        <span class="badge badge-blue">${items.length} total</span>
      </div>
      ${recent.length ? auditTable(recent) : '<p>No audit entries yet.</p>'}
    </div>
    ${
      archived.length
        ? `<div class="panel">
            <details class="audit-archive">
              <summary>Archived activity (${archived.length})</summary>
              <div style="margin-top:0.75rem;">${auditTable(archived)}</div>
            </details>
          </div>`
        : ''
    }
  `;

  dispatchPageData('audit', items);
}

/* Bridge used by the React shell for auth state. The page renderers below keep
 * using `state`, so every auth transition flows through here. */
window.adminBridge = {
  applySession(data) {
    state.user = data.user;
    state.csrfToken = data.csrfToken;
    state.sessionIdleMinutes = data.sessionIdleMinutes || 10;
    showAdminShell();
  },
  async signOut() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    state.user = null;
    state.csrfToken = '';
    showAuthView();
  },
  getState() {
    return { ...state };
  },
};
