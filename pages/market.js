/**
 * pages/market.js — 二手市场页逻辑
 */

import { renderNavUser, toast, esc, productCard, detailModalHTML, emptyHTML, showBuyChoice, showAdminDeleteModal, addViewHot, addContactHot, addFavHot } from '../utils/ui.js';
import { getGoods, toggleFavorite, deleteGoods, getGoodsById } from '../api/goodsApi.js';
import { logout } from '../utils/auth.js';

let currentUser = null;
let debounceTimer = null;

async function init() {
  currentUser = await renderNavUser();

  // 筛选控件监听
  document.getElementById('searchInput')   ?.addEventListener('input',  () => debounceLoad());
  document.getElementById('categoryFilter')?.addEventListener('change', () => loadMarket());
  document.getElementById('conditionFilter')?.addEventListener('change', () => loadMarket());
  document.getElementById('sortFilter')    ?.addEventListener('change', () => loadMarket());

  bindDetailModal();
  await loadMarket();
}

function debounceLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadMarket, 300);
}

async function loadMarket() {
  const grid = document.getElementById('marketProducts');
  grid.innerHTML = '<div class="empty">加载中…</div>';

  const keyword  = document.getElementById('searchInput')?.value.trim()   ?? '';
  const category = document.getElementById('categoryFilter')?.value        ?? '';
  const condition = document.getElementById('conditionFilter')?.value      ?? '';
  const sort     = document.getElementById('sortFilter')?.value            ?? 'new';

  try {
    const goods = await getGoods({ keyword, category, condition, sort, limit: 60 });
    if (!goods.length) {
      grid.innerHTML = emptyHTML('没有找到符合条件的商品');
      return;
    }
    const cards = await Promise.all(goods.map(p => productCard(p, currentUser?.id)));
    grid.innerHTML = cards.join('');
    bindProductEvents(grid);
  } catch (e) {
    grid.innerHTML = emptyHTML('加载失败，请刷新重试');
    console.error(e);
  }
}

function bindProductEvents(container) {
  container.querySelectorAll('.fav').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!currentUser) { toast('请先登录后再收藏'); window.location.href = '/login.html'; return; }
      try {
        const { action } = await toggleFavorite(currentUser.id, btn.dataset.id);
        btn.classList.toggle('active', action === 'added');
        toast(action === 'added' ? '收藏成功' : '已取消收藏');
      } catch (err) { toast(err.message); }
    });
  });

  container.querySelectorAll('.view-detail, .product-img, .product-title').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.closest('[data-id]')?.dataset.id;
      if (id) openDetail(id);
    });
  });
}

async function openDetail(id) {
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
    if (!currentUser) { toast('请先登录'); window.location.href = '/login.html'; return; }
    addContactHot(p.id);
    const sellerId = card.querySelector('#contactSellerBtn').dataset.seller;
    window.location.href = `/messages.html?to=${sellerId}`;
  });

  // 收藏状态初始化
  if (currentUser) {
    import('../api/goodsApi.js').then(m => m.isFavorite(currentUser.id, p.id)).then(fav => {
      if (fav) card.querySelector('#toggleFavBtn').textContent = '取消收藏';
    }).catch(() => {});
  }

  card.querySelector('#toggleFavBtn')?.addEventListener('click', async () => {
    if (!currentUser) { toast('请先登录'); window.location.href = '/login.html'; return; }
    try {
      const { action } = await toggleFavorite(currentUser.id, p.id);
      card.querySelector('#toggleFavBtn').textContent = action === 'added' ? '取消收藏' : '收藏商品';
      toast(action === 'added' ? '收藏成功' : '已取消收藏');
      if (action === 'added') addFavHot(p.id);
      // 同步卡片爱心状态
      document.querySelector(`.fav[data-id="${p.id}"]`)?.classList.toggle('active', action === 'added');
    } catch (e) { toast(e.message); }
  });

  card.querySelector('#deleteGoodsBtn')?.addEventListener('click', async () => {
    if (!confirm('确定删除这个商品吗？')) return;
    try {
      await deleteGoods(p.id);
      modal.classList.remove('show');
      toast('商品已删除');
      loadMarket();
    } catch (e) { toast(e.message); }
  });

  card.querySelector('#buyGoodsBtn')?.addEventListener('click', async () => {
    if (!currentUser) { toast('请先登录'); window.location.href = '/login.html'; return; }
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
        loadMarket();
      }
    });
  });

  card.querySelector('#adminDeleteGoodsBtn')?.addEventListener('click', () => {
    showAdminDeleteModal(p.id, async (reason) => {
      const { apiFetch } = await import('../lib/apiClient.js');
      await apiFetch(`/api/admin/goods/${p.id}`, { method: 'DELETE', body: { reason } });
      modal.classList.remove('show');
      toast('商品已下架并通知卖家');
      loadMarket();
    });
  });
}

function bindDetailModal() {
  document.getElementById('detailModal')?.addEventListener('click', e => {
    if (e.target.id === 'detailModal') e.target.classList.remove('show');
  });
}

init();
