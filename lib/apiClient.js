const API_BASE = '';

function getAuthToken() {
  return localStorage.getItem('xiaoyitong_token');
}

function getHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiFetch(path, options = {}) {
  const url = API_BASE + path;
  const init = {
    credentials: 'same-origin',
    ...options,
    headers: getHeaders(options.headers),
  };
  if (init.body && typeof init.body === 'object' && !(init.body instanceof FormData)) {
    init.body = JSON.stringify(init.body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    let errorMessage = `请求失败：${res.status}`;
    try {
      const data = contentType.includes('application/json') ? await res.json() : null;
      if (data?.error) errorMessage = data.error;
      else if (data?.message) errorMessage = data.message;
    } catch (_err) {}
    throw new Error(errorMessage);
  }
  if (res.status === 204) return null;
  return res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text();
}

export function saveAuthToken(token) {
  localStorage.setItem('xiaoyitong_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('xiaoyitong_token');
}

export function getAuthTokenValue() {
  return getAuthToken();
}
