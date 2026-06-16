const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

// Lets AuthContext react to an expired/invalid token surfaced by any request.
function emitAuthFailure(status) {
  window.dispatchEvent(new CustomEvent('auth:failure', { detail: { status } }));
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Only treat token failures from authed calls as session-expiry — public
    // 401/403 (none today, but defensive) shouldn't nuke the session.
    if (auth && (res.status === 401 || res.status === 403)) emitAuthFailure(res.status);
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),
  verifyCode: (code) => request('/auth/verify-code', { method: 'POST', body: { code }, auth: true }),
  resendVerification: () => request('/auth/resend-verification', { method: 'POST', auth: true }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload }),

  listNetas: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/netas${qs ? `?${qs}` : ''}`);
  },
  getNeta: (id) => request(`/netas/${id}`),
  categories: () => request('/netas/categories'),
  states: () => request('/netas/states'),

  rate: (payload) => request('/ratings', { method: 'POST', body: payload, auth: true }),
  myRatings: () => request('/ratings/mine', { auth: true }),

  admin: {
    create: (data) => request('/admin/netas', { method: 'POST', body: data, auth: true }),
    update: (id, data) => request(`/admin/netas/${id}`, { method: 'PUT', body: data, auth: true }),
    remove: (id) => request(`/admin/netas/${id}`, { method: 'DELETE', auth: true }),
    scrapeImport: (data) => request('/admin/scrape-import', { method: 'POST', body: data, auth: true }),
    scrapeCandidate: (detailUrl) => request('/admin/scrape-candidate', { method: 'POST', body: { detailUrl }, auth: true }),
    listApplications: (status = 'pending') => request(`/admin-applications?status=${encodeURIComponent(status)}`, { auth: true }),
    approveApplication: (id, note = '') => request(`/admin-applications/${id}/approve`, { method: 'POST', body: { note }, auth: true }),
    rejectApplication: (id, note = '') => request(`/admin-applications/${id}/reject`, { method: 'POST', body: { note }, auth: true }),
  },

  applyForAdmin: (reason) => request('/admin-applications', { method: 'POST', body: { reason }, auth: true }),
  myApplications: () => request('/admin-applications/mine', { auth: true }),
};
