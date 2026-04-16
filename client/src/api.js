const TOKEN_KEY = 'cht_token';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  signup: (username, password) => request('/api/auth/signup', { method: 'POST', body: { username, password }, auth: false }),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => request('/api/auth/me'),
  users: () => request('/api/users'),
  conversations: () => request('/api/conversations'),
  openDm: (user_id) => request('/api/conversations/dm', { method: 'POST', body: { user_id } }),
  createGroup: (name, member_ids) => request('/api/conversations/group', { method: 'POST', body: { name, member_ids } }),
  messages: (convId) => request(`/api/conversations/${convId}/messages`),
};
