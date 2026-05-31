/**
 * api/goodsApi.js
 * 商品相关的 REST API 操作
 */

import { apiFetch } from '../lib/apiClient.js';

export async function getGoods({ keyword = '', category = '', condition = '', sort = 'new', limit = 40 } = {}) {
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (category) params.set('category', category);
  if (condition) params.set('condition', condition);
  if (sort) params.set('sort', sort);
  if (limit) params.set('limit', limit);
  return apiFetch(`/api/goods?${params.toString()}`);
}

export async function getGoodsById(id) {
  return apiFetch(`/api/goods/${id}`);
}

export async function getLatestGoods(limit = 4) {
  return apiFetch(`/api/goods/latest?limit=${limit}`);
}

export async function uploadGoodsImage(file) {
  const form = new FormData();
  form.append('file', file);
  const { getAuthTokenValue } = await import('../lib/apiClient.js');
  const token = getAuthTokenValue();
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || `上传失败 (${res.status})`);
  }
  const data = await res.json();
  return data.url;
}

export async function publishGoods({ title, price, category, condition, location, description, imageFile }) {
  let image_url = '';
  if (imageFile) {
    image_url = await uploadGoodsImage(imageFile);
  }
  return apiFetch('/api/goods', {
    method: 'POST',
    body: { title, price, category, condition, location, description, image_url }
  });
}

export async function deleteGoods(goodsId) {
  return apiFetch(`/api/goods/${goodsId}`, { method: 'DELETE' });
}

export async function getFavorites() {
  return apiFetch('/api/favorites');
}

export async function toggleFavorite(userId, goodsId) {
  return apiFetch(`/api/favorites/${goodsId}`, { method: 'POST' });
}

export async function isFavorite(userId, goodsId) {
  const list = await getFavorites();
  return list.some(item => item.goods_id === goodsId);
}
