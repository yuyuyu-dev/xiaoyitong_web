/**
 * utils/ui.js
 * 共享的 UI 工具函数（toast、渲染导航用户信息、商品卡片、时间格式化等）
 */

import { getCurrentUser } from './auth.js';
import { isFavorite }     from '../api/goodsApi.js';

/* ── Toast 通知 ── */
export function toast(text, duration = 2200) {
  const box = document.getElementById('toast');
  if (!box) return;
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.textContent = text;
  box.appendChild(item);
  setTimeout(() => item.remove(), duration);
}

/* ── 转义 HTML ── */
export function esc(str) {
  return String(str ?? '').replace(/[&<>'"]/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[s]));
}

/* ── 相对时间 ── */
export function timeAgo(isoOrTs) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(isoOrTs).getTime()) / 1000));
  if (diff < 60)    return `${diff} 秒前`;
  if (diff < 3600)  return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

/* ── 空状态占位 ── */
export function emptyHTML(text) {
  return `<div class="empty">${esc(text)}</div>`;
}

/* ── 更新导航栏用户信息 ── */
export async function renderNavUser() {
  const user = await getCurrentUser();

  const avatarEl  = document.getElementById('userAvatar');
  const nameEl    = document.getElementById('userName');
  const schoolEl  = document.getElementById('userSchool');
  const loginBtn  = document.getElementById('loginBtn');   // index.html 专有
  const logoutBtn = document.getElementById('logoutBtn');  // user-center.html 专有
  const loginLink = document.getElementById('loginLink');

  if (user) {
    if (avatarEl) {
      if (user.avatar_url) {
        avatarEl.innerHTML = `<img src="${esc(user.avatar_url)}" alt="头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
      } else {
        avatarEl.textContent = (user.nickname ?? '我').slice(0, 1);
      }
    }
    if (nameEl)   nameEl.textContent    = user.nickname ?? '未知用户';
    if (schoolEl) schoolEl.textContent  = user.school   ?? '';
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (loginLink) loginLink.style.display = 'none';
  } else {
    if (avatarEl) avatarEl.textContent  = '游';
    if (nameEl)   nameEl.textContent    = '游客模式';
    if (schoolEl) schoolEl.textContent  = '请登录体验完整功能';
    if (loginBtn)  loginBtn.style.display  = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (loginLink) loginLink.style.display = '';
  }

  // 未读消息红点
  if (user) updateUnreadBadge();

  return user;
}

async function updateUnreadBadge() {
  try {
    const { getUnreadCount } = await import('../api/userApi.js');
    const { count } = await getUnreadCount();
    const msgLink = document.querySelector('.nav-links a[href*="messages"]');
    if (!msgLink) return;
    msgLink.querySelector('.unread-badge')?.remove();
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'unread-badge';
      badge.textContent = count > 99 ? '99+' : count;
      msgLink.style.position = 'relative';
      msgLink.appendChild(badge);
    }
  } catch (_) { /* 静默失败 */ }
}

/* ── 商品卡片 HTML ── */
export async function productCard(p, currentUserId) {
  let favActive = false;
  if (currentUserId) {
    try { favActive = await isFavorite(currentUserId, p.id); } catch (_) {}
  }

  const seller    = p.profiles;
  const sellerName = seller?.nickname ?? '未知用户';
  const imgSrc = p.image_url
    || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80';

  return `
    <article class="product-card" data-id="${esc(p.id)}">
      <div class="product-img">
        <img src="${esc(imgSrc)}" alt="${esc(p.title)}" loading="lazy" />
        <span class="tag">${esc(p.category)}</span>
        <button class="fav ${favActive ? 'active' : ''}" data-id="${esc(p.id)}" aria-label="收藏">♥</button>
      </div>
      <div class="product-body">
        <div class="product-title">${esc(p.title)}</div>
        <div class="price-row">
          <div class="price">￥${Number(p.price).toFixed(0)}</div>
          <div class="condition">${esc(p.condition)}</div>
        </div>
        <div class="seller">
          <div class="seller-left">
            <div class="seller-avatar">${sellerName.slice(0, 1)}</div>
            <span>${esc(sellerName)} · ${timeAgo(p.created_at)}</span>
          </div>
        </div>
        <button class="mini-btn view-detail" data-id="${esc(p.id)}">查看详情</button>
      </div>
    </article>
  `;
}

/* ── 热度 +2（收藏） ── */
export async function addFavHot(goodsId) {
  try {
    await fetch(`/api/goods/${goodsId}/hot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: 2 })
    });
  } catch (_) {}
}

/* ── 热度 +1（浏览，每人每商品只计一次） ── */
export async function addViewHot(goodsId) {
  try {
    const key = 'xxt_viewed';
    const viewed = JSON.parse(localStorage.getItem(key) || '{}');
    if (viewed[goodsId]) return;
    viewed[goodsId] = Date.now();
    // 只保留最近 500 条，避免无限增长
    const keys = Object.keys(viewed);
    if (keys.length > 500) {
      keys.sort((a, b) => viewed[a] - viewed[b]);
      keys.slice(0, keys.length - 500).forEach(k => delete viewed[k]);
    }
    localStorage.setItem(key, JSON.stringify(viewed));
    await fetch(`/api/goods/${goodsId}/hot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: 1 })
    });
  } catch (_) {}
}

/* ── 热度 +3（联系卖家） ── */
export async function addContactHot(goodsId) {
  try {
    await fetch(`/api/goods/${goodsId}/hot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: 3 })
    });
  } catch (_) {}
}

/* ── 购买选择弹窗（协商 / 直接购买） ── */
export function showBuyChoice({ sellerId, goodsId, price, title, onSuccess }) {
  document.getElementById('buyChoiceModal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'buyChoiceModal';
  modal.innerHTML = `
    <div class="modal-card pay-confirm-card">
      <div class="pay-confirm-body">
        <div class="pay-icon">🛒</div>
        <h3>购买商品</h3>
        <p class="pay-item-name">${esc(title)}</p>
        <p class="pay-amount">￥${esc(price)}</p>
        <div class="pay-actions" style="flex-direction:column;gap:12px;">
          <button class="ghost-btn" id="chatSellerBtn" style="width:100%;">与卖家协商</button>
          <button class="primary-btn" id="directBuyBtn" style="width:100%;">直接购买</button>
          <button class="ghost-btn" id="buyChoiceCancelBtn" style="width:100%;color:#94a3b8;">取消</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#buyChoiceCancelBtn').addEventListener('click', () => modal.remove());

  modal.querySelector('#chatSellerBtn').addEventListener('click', () => {
    modal.remove();
    const msg = encodeURIComponent('你好同学，我对你上架的商品很感兴趣，可以谈谈吗？');
    window.location.href = `/messages.html?to=${sellerId}&msg=${msg}`;
  });

  modal.querySelector('#directBuyBtn').addEventListener('click', () => {
    modal.remove();
    showPayConfirm({ goodsId, price, title, onSuccess });
  });
}

/* ── 支付确认弹窗 ── */
function showPayConfirm({ goodsId, price, title, onSuccess }) {
  document.getElementById('payConfirmModal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'payConfirmModal';
  modal.innerHTML = `
    <div class="modal-card pay-confirm-card">
      <div class="pay-confirm-body">
        <div class="pay-icon">💳</div>
        <h3>确认支付</h3>
        <p class="pay-item-name">${esc(title)}</p>
        <p class="pay-amount">￥${esc(price)}</p>
        <div class="pay-disclaimer">
          <p>因为根据相关规定，在线支付功能需完成备案。</p>
          <p>所以我们小组通过<strong>模拟支付</strong>来演示交易功能。</p>
          <p>点击「确认支付」后将直接完成交易。</p>
        </div>
        <div class="pay-actions">
          <button class="ghost-btn" id="payCancelBtn">取消</button>
          <button class="primary-btn" id="payConfirmBtn">确认支付（模拟）</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#payCancelBtn').addEventListener('click', () => modal.remove());

  modal.querySelector('#payConfirmBtn').addEventListener('click', async () => {
    const btn = modal.querySelector('#payConfirmBtn');
    btn.disabled = true;
    btn.textContent = '支付中…';
    try {
      await onSuccess();
      modal.remove();
    } catch (e) {
      toast(e.message || '支付失败');
      btn.disabled = false;
      btn.textContent = '确认支付（模拟）';
    }
  });
}

/* ── 管理员下架弹窗 ── */
export function showAdminDeleteModal(goodsId, onSuccess) {
  document.getElementById('adminDeleteModal')?.remove();

  const reasons = ['商品信息虚假', '违禁物品', '价格欺诈', '重复发布', '侵权内容', '其他违规'];
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.id = 'adminDeleteModal';
  modal.innerHTML = `
    <div class="modal-card pay-confirm-card">
      <div class="pay-confirm-body">
        <h3>管理员下架商品</h3>
        <p style="color:#64748b;font-size:14px;margin-bottom:18px;">请选择违规原因，确认后商品将被下架并通知卖家。</p>
        <div class="admin-reason-list">
          ${reasons.map((r, i) => `<label class="admin-reason-item"><input type="radio" name="violationReason" value="${esc(r)}" ${i === 0 ? 'checked' : ''} /> ${esc(r)}</label>`).join('')}
        </div>
        <div class="pay-actions" style="margin-top:18px;">
          <button class="ghost-btn" id="adminDeleteCancelBtn">取消</button>
          <button class="danger-btn" id="adminDeleteConfirmBtn">确认下架</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#adminDeleteCancelBtn').addEventListener('click', () => modal.remove());

  modal.querySelector('#adminDeleteConfirmBtn').addEventListener('click', async () => {
    const reason = modal.querySelector('input[name="violationReason"]:checked')?.value;
    if (!reason) { toast('请选择违规原因'); return; }
    const btn = modal.querySelector('#adminDeleteConfirmBtn');
    btn.disabled = true;
    btn.textContent = '下架中…';
    try {
      await onSuccess(reason);
      modal.remove();
    } catch (e) {
      toast(e.message || '操作失败');
      btn.disabled = false;
      btn.textContent = '确认下架';
    }
  });
}

/* ── 商品详情弹窗 HTML ── */
export function detailModalHTML(p, currentUserId, isAdmin = false) {
  const seller      = p.profiles;
  const sellerName  = seller?.nickname  ?? '未知用户';
  const sellerSchool = seller?.school   ?? '';
  const sellerBio   = seller?.bio       ?? '该用户暂未填写简介。';
  const imgSrc = p.image_url
    || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80';

  const canDelete = currentUserId && currentUserId === p.seller_id;
  const isSold = p.status === 'sold';
  const isRemoved = p.status === 'removed';
  const isUnavailable = isSold || isRemoved;
  const canBuy = currentUserId && currentUserId !== p.seller_id && !isUnavailable && !isAdmin;
  const canAdminDelete = isAdmin && !isUnavailable;

  return `
    <div class="detail-grid">
      <div class="detail-img" data-fullsrc="${esc(imgSrc)}"><img src="${esc(imgSrc)}" alt="${esc(p.title)}" /><span class="detail-img-hint">点击查看大图</span></div>
      <div class="detail-content">
        <div class="close-row">
          <span class="badge">${esc(p.category)} · ${esc(p.condition)}</span>
          <button class="close-btn" id="closeDetailBtn">×</button>
        </div>
        <h2>${esc(p.title)}</h2>
        <div class="price" style="font-size:34px;margin-bottom:10px;">￥${Number(p.price).toFixed(0)}</div>
        ${isSold ? '<div style="color:#dc2626;font-weight:800;font-size:16px;margin-bottom:10px;">该商品已售出</div>' : ''}
        ${isRemoved ? '<div style="color:#ea580c;font-weight:800;font-size:16px;margin-bottom:10px;">该商品已被下架</div>' : ''}
        <div class="detail-meta">
          <span class="pill">卖家：${esc(sellerName)}</span>
          <span class="pill">地点：${esc(p.location)}</span>
          <span class="pill">热度：${p.hot ?? 0}</span>
          <span class="pill">${timeAgo(p.created_at)}</span>
        </div>
        <p style="color:#475569;line-height:1.9;margin:18px 0 24px;">${esc(p.description ?? '')}</p>
        <div class="notice-card" style="box-shadow:none;margin-bottom:18px;">
          <h3>卖家信息</h3>
          <p>${esc(sellerSchool)}<br>${esc(sellerBio)}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${canBuy ? `<button class="primary-btn" id="buyGoodsBtn" data-id="${esc(p.id)}" data-price="${Number(p.price).toFixed(0)}" data-title="${esc(p.title)}">购买</button>` : ''}
          <button class="ghost-btn" id="contactSellerBtn" data-seller="${esc(seller?.id ?? '')}">联系卖家</button>
          <button class="ghost-btn" id="toggleFavBtn" data-id="${esc(p.id)}">收藏商品</button>
          ${canDelete ? `<button class="danger-btn" id="deleteGoodsBtn" data-id="${esc(p.id)}">删除商品</button>` : ''}
          ${canAdminDelete ? `<button class="danger-btn" id="adminDeleteGoodsBtn" data-id="${esc(p.id)}">下架商品</button>` : ''}
        </div>
      </div>
    </div>
  `;
}
