/**
 * api/transactionsApi.js — 交易相关的 REST API 操作
 */

import { apiFetch } from '../lib/apiClient.js';

export async function buyGoods(goodsId) {
  return apiFetch('/api/transactions', {
    method: 'POST',
    body: { goods_id: goodsId }
  });
}

export async function getBoughtTransactions() {
  return apiFetch('/api/transactions/bought');
}

export async function getSoldTransactions() {
  return apiFetch('/api/transactions/sold');
}
