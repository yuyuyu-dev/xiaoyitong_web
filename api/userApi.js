/**
 * api/userApi.js
 * 用户信息 & 私信相关的 REST API 操作
 */

import { apiFetch } from '../lib/apiClient.js';

export async function getProfile(userId) {
  return apiFetch(`/api/profiles/${userId}`);
}

export async function updateProfile({ nickname, school, bio, avatar_url }) {
  return apiFetch('/api/profiles', {
    method: 'PUT',
    body: { nickname, school, bio, avatar_url }
  });
}

export async function getUserGoods(userId) {
  return apiFetch(`/api/goods?userId=${encodeURIComponent(userId)}&limit=100`);
}

export async function getConversation(otherId) {
  return apiFetch(`/api/messages/conversation/${otherId}`);
}

export async function getConversationList() {
  return apiFetch('/api/messages/conversations');
}

export async function sendMessage(toId, content) {
  return apiFetch('/api/messages', {
    method: 'POST',
    body: { to_id: toId, content }
  });
}

export async function getUnreadCount() {
  return apiFetch('/api/messages/unread-count');
}

export async function markMessagesRead() {
  return apiFetch('/api/messages/mark-read', { method: 'POST' });
}
