/**
 * utils/auth.js
 * 统一处理登录状态、会话、token 验证
 */

import { apiFetch, saveAuthToken, removeAuthToken } from '../lib/apiClient.js';

export async function getCurrentUser() {
  try {
    return await apiFetch('/api/profiles');
  } catch (err) {
    // 只在认证失败时清除 token，网络错误或服务器错误不应导致登出
    if (err.message?.includes('401') || err.message?.includes('登录已过期') || err.message?.includes('未登录')) {
      removeAuthToken();
    }
    return null;
  }
}

export async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  saveAuthToken(data.token);
  return data.user;
}

export async function requestRegisterCode(email, password, nickname, school) {
  return apiFetch('/api/auth/request-register-code', {
    method: 'POST',
    body: { email, password, nickname, school }
  });
}

export async function confirmRegisterCode(email, code) {
  const data = await apiFetch('/api/auth/confirm-register-code', {
    method: 'POST',
    body: { email, code }
  });
  saveAuthToken(data.token);
  return data.user;
}

export async function resendRegisterCode(email) {
  return apiFetch('/api/auth/resend-register-code', {
    method: 'POST',
    body: { email }
  });
}

export async function logout() {
  removeAuthToken();
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login.html';
  }
  return user;
}
