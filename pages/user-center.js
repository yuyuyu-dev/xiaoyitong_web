/**
 * pages/user-center.js — 个人中心逻辑
 */

import { logout } from '../utils/auth.js';
import { renderNavUser, toast, esc, timeAgo, emptyHTML, showBuyChoice, showAdminDeleteModal, addViewHot, addContactHot, addFavHot } from '../utils/ui.js';
import { getUserGoods, updateProfile }       from '../api/userApi.js';
import { getFavorites, getGoodsById, toggleFavorite, deleteGoods } from '../api/goodsApi.js';
import { getBoughtTransactions, getSoldTransactions } from '../api/transactionsApi.js';
import { detailModalHTML }                   from '../utils/ui.js';
import { getAuthTokenValue }                 from '../lib/apiClient.js';

let currentUser = null;
let activeTab   = 'products';
let txSubTab    = 'bought';

async function init() {
  currentUser = await renderNavUser();

  // 未登录则跳转登录页
  if (!currentUser) {
    window.location.href = '/login.html';
    return;
  }

  // 渲染个人资料卡
  renderProfileCard();

  // 退出登录
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
      await logout();
      toast('已退出登录');
      setTimeout(() => { window.location.href = '/index.html'; }, 600);
    } catch (e) { toast(e.message); }
  });

  // 编辑资料
  document.getElementById('editProfileBtn')?.addEventListener('click', enterEditMode);
  document.getElementById('cancelEditBtn')?.addEventListener('click', exitEditMode);
  document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
  document.getElementById('avatarInput')?.addEventListener('change', handleAvatarChange);

  // Tab 切换
  document.querySelectorAll('.tabs button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.tabs button[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadList();
    });
  });

  bindDetailModal();
  if (currentUser) await loadList();
}

function renderProfileCard() {
  const avatarEl   = document.getElementById('profileAvatar');
  const nameEl     = document.getElementById('profileName');
  const schoolEl   = document.getElementById('profileSchool');
  const bioEl      = document.getElementById('profileBio');
  const loginLink  = document.getElementById('loginLink');
  const logoutBtn  = document.getElementById('logoutBtn');
  const editBtn    = document.getElementById('editProfileBtn');

  if (currentUser) {
    if (currentUser.avatar_url) {
      avatarEl.innerHTML = `<img src="${esc(currentUser.avatar_url)}" alt="头像" />`;
    } else {
      avatarEl.textContent = (currentUser.nickname ?? '我').slice(0, 1);
    }
    nameEl.textContent   = currentUser.nickname ?? '未知用户';
    schoolEl.textContent = currentUser.school || '';
    bioEl.textContent    = currentUser.bio || '这个人很懒，什么都没留下。';
    loginLink.style.display  = 'none';
    logoutBtn.style.display  = 'inline-flex';
    editBtn.style.display    = 'inline-flex';
  } else {
    avatarEl.textContent = '游';
    nameEl.textContent   = '游客模式';
    schoolEl.textContent = '';
    bioEl.textContent    = '登录后可发布商品、收藏商品、私信卖家。';
    loginLink.style.display  = '';
    logoutBtn.style.display  = 'none';
    editBtn.style.display    = 'none';
  }
}

function enterEditMode() {
  document.getElementById('profileView').style.display = 'none';
  document.getElementById('profileEdit').style.display = '';

  const avatarPreview = document.getElementById('editAvatarPreview');
  if (currentUser.avatar_url) {
    avatarPreview.innerHTML = `<img src="${esc(currentUser.avatar_url)}" alt="头像" />`;
  } else {
    avatarPreview.textContent = (currentUser.nickname ?? '我').slice(0, 1);
  }

  document.getElementById('editNickname').value = currentUser.nickname || '';
  document.getElementById('editSchool').value   = currentUser.school || '';
  document.getElementById('editBio').value      = currentUser.bio || '';
}

function exitEditMode() {
  document.getElementById('profileEdit').style.display = 'none';
  document.getElementById('profileView').style.display = '';
}

let pendingAvatarUrl = null;

async function handleAvatarChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.getElementById('editAvatarPreview');
  // 本地预览
  const reader = new FileReader();
  reader.onload = () => { preview.innerHTML = `<img src="${reader.result}" alt="头像" />`; };
  reader.readAsDataURL(file);

  // 上传到服务器
  try {
    const token = getAuthTokenValue();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || '上传失败');
    pendingAvatarUrl = data.url;
  } catch (err) {
    toast(err.message || '头像上传失败');
    pendingAvatarUrl = null;
  }
}

async function saveProfile() {
  const nickname = document.getElementById('editNickname').value.trim();
  const school   = document.getElementById('editSchool').value.trim();
  const bio      = document.getElementById('editBio').value.trim();

  if (!nickname) return toast('请填写昵称');
  if (!school) return toast('请填写学校');

  const btn = document.getElementById('saveProfileBtn');
  btn.disabled = true;
  btn.textContent = '保存中…';

  try {
    const payload = { nickname, school, bio };
    if (pendingAvatarUrl) payload.avatar_url = pendingAvatarUrl;
    const updated = await updateProfile(payload);
    // 更新本地 currentUser
    Object.assign(currentUser, updated);
    pendingAvatarUrl = null;
    renderProfileCard();
    exitEditMode();
    toast('资料已更新');
  } catch (err) {
    toast(err.message || '保存失败');
  } finally {
    btn.disabled = false;
    btn.textContent = '保存';
  }
}

async function loadList() {
  const listEl = document.getElementById('profileList');
  listEl.innerHTML = '<div class="empty">加载中…</div>';

  if (!currentUser) {
    listEl.innerHTML = emptyHTML('请先登录');
    return;
  }

  try {
    if (activeTab === 'transactions') {
      await loadTransactions(listEl);
      return;
    }

    let items = [];
    if (activeTab === 'products') {
      items = await getUserGoods(currentUser.id);
    } else {
      const favs = await getFavorites();
      items = favs.map(f => f.goods || f).filter(Boolean);
    }

    if (!items.length) {
      listEl.innerHTML = emptyHTML(activeTab === 'products' ? '你还没有发布商品' : '你还没有收藏商品');
      return;
    }

    listEl.innerHTML = items.map(p => {
      const stamp = p.status === 'sold' ? '已卖出' : p.status === 'removed' ? '已下架' : '';
      const stampClass = p.status === 'removed' ? 'removed-stamp' : 'sold-stamp';
      return `
      <div class="list-item${stamp ? ' sold' : ''}">
        <div class="list-item-img-wrap">
          <img
            src="${esc(p.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=60')}"
            alt="${esc(p.title)}"
            loading="lazy"
          />
          ${stamp ? `<span class="${stampClass}">${stamp}</span>` : ''}
        </div>
        <div>
          <h4>${esc(p.title)}</h4>
          <p>￥${Number(p.price).toFixed(0)} · ${esc(p.category)} · ${esc(p.condition)} · ${esc(p.location)}</p>
          <p style="margin-top:4px;">${timeAgo(p.created_at)}</p>
        </div>
        <div class="actions">
          <button class="mini-btn view-detail" data-id="${esc(p.id)}">详情</button>
        </div>
      </div>
    `;}).join('');

    // 绑定详情按钮事件
    listEl.querySelectorAll('.view-detail').forEach(btn => {
      btn.addEventListener('click', () => openDetail(btn.dataset.id));
    });
  } catch (e) {
    listEl.innerHTML = emptyHTML('加载失败，请刷新重试');
    console.error(e);
  }
}

async function loadTransactions(listEl) {
  // 子标签
  listEl.innerHTML = `
    <div class="sub-tabs">
      <button class="${txSubTab === 'bought' ? 'active' : ''}" data-sub="bought">我买到的</button>
      <button class="${txSubTab === 'sold' ? 'active' : ''}" data-sub="sold">我卖出的</button>
    </div>
    <div class="tx-list"><div class="empty">加载中…</div></div>
  `;

  listEl.querySelectorAll('.sub-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      txSubTab = btn.dataset.sub;
      listEl.querySelectorAll('.sub-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTxList(listEl);
    });
  });

  await loadTxList(listEl);
}

async function loadTxList(listEl) {
  const txListEl = listEl.querySelector('.tx-list');
  txListEl.innerHTML = '<div class="empty">加载中…</div>';

  try {
    const txs = txSubTab === 'bought' ? await getBoughtTransactions() : await getSoldTransactions();

    if (!txs.length) {
      txListEl.innerHTML = emptyHTML(txSubTab === 'bought' ? '你还没有买到商品' : '你还没有卖出商品');
      return;
    }

    txListEl.innerHTML = txs.map(tx => `
      <div class="list-item tx-item">
        <div class="list-item-img-wrap">
          <img
            src="${esc(tx.goods?.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=60')}"
            alt="${esc(tx.goods?.title)}"
            loading="lazy"
          />
        </div>
        <div>
          <h4>${esc(tx.goods?.title)}</h4>
          <p>￥${Number(tx.price).toFixed(0)} · ${esc(tx.goods?.category)}</p>
          <p style="margin-top:4px;">${txSubTab === 'bought' ? '卖家：' + esc(tx.seller?.nickname) : '买家：' + esc(tx.buyer?.nickname)} · ${timeAgo(tx.created_at)}</p>
        </div>
        <div class="actions">
          <span class="tx-status">交易完成</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    txListEl.innerHTML = emptyHTML('加载失败，请刷新重试');
    console.error(e);
  }
}

// ── 商品详情弹窗 ──
async function openDetail(id) {
  if (!id) return;
  let p;
  try { p = await getGoodsById(id); } catch (e) { toast('加载失败'); return; }

  const modal = document.getElementById('detailModal');
  const card  = document.getElementById('detailCard');
  card.innerHTML = detailModalHTML(p, currentUser?.id, currentUser?.is_admin);
  modal.classList.add('show');
  addViewHot(p.id);

  card.querySelector('#closeDetailBtn')?.addEventListener('click', () => modal.classList.remove('show'));

  // 点击图片查看原图
  card.querySelector('.detail-img')?.addEventListener('click', () => {
    const src = card.querySelector('.detail-img')?.dataset.fullsrc;
    if (!src) return;
    const viewer = document.createElement('div');
    viewer.className = 'img-viewer';
    viewer.innerHTML = `<img src="${src}" alt="${esc(p.title)}" />`;
    viewer.addEventListener('click', () => viewer.remove());
    document.body.appendChild(viewer);
  });

  card.querySelector('#contactSellerBtn')?.addEventListener('click', () => {
    addContactHot(p.id);
    window.location.href = `/messages.html?to=${p.seller_id}`;
  });

  // 收藏状态初始化
  import('../api/goodsApi.js').then(m => m.isFavorite(currentUser.id, p.id)).then(fav => {
    if (fav) card.querySelector('#toggleFavBtn').textContent = '取消收藏';
  }).catch(() => {});

  card.querySelector('#toggleFavBtn')?.addEventListener('click', async () => {
    try {
      const { action } = await toggleFavorite(currentUser.id, p.id);
      card.querySelector('#toggleFavBtn').textContent = action === 'added' ? '取消收藏' : '收藏商品';
      toast(action === 'added' ? '收藏成功' : '已取消收藏');
      if (action === 'added') addFavHot(p.id);
    } catch (e) { toast(e.message); }
  });

  card.querySelector('#deleteGoodsBtn')?.addEventListener('click', async () => {
    if (!confirm('确定删除这个商品吗？')) return;
    try {
      await deleteGoods(p.id);
      modal.classList.remove('show');
      toast('商品已删除');
      loadList();
    } catch (e) { toast(e.message); }
  });

  card.querySelector('#buyGoodsBtn')?.addEventListener('click', async () => {
    const { buyGoods } = await import('../api/transactionsApi.js');
    showBuyChoice({
      sellerId: p.seller_id,
      goodsId: p.id,
      price: Number(p.price).toFixed(0),
      title: p.title,
      onSuccess: async () => {
        await buyGoods(p.id);
        modal.classList.remove('show');
        toast('购买成功！');
        loadList();
      }
    });
  });

  card.querySelector('#adminDeleteGoodsBtn')?.addEventListener('click', () => {
    showAdminDeleteModal(p.id, async (reason) => {
      const { apiFetch } = await import('../lib/apiClient.js');
      await apiFetch(`/api/admin/goods/${p.id}`, { method: 'DELETE', body: { reason } });
      modal.classList.remove('show');
      toast('商品已下架并通知卖家');
      loadList();
    });
  });
}

function bindDetailModal() {
  document.getElementById('detailModal')?.addEventListener('click', e => {
    if (e.target.id === 'detailModal') e.target.classList.remove('show');
  });
}

init();
