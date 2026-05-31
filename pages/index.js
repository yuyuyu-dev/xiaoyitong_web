/**
 * pages/index.js — 校易通 Launch Page
 * GSAP-powered entrance animations + data loading
 */

import { getCurrentUser } from '../utils/auth.js';
import { renderNavUser, toast, esc, productCard, detailModalHTML, emptyHTML, showBuyChoice, showAdminDeleteModal, addViewHot, addContactHot, addFavHot } from '../utils/ui.js';
import { getLatestGoods, toggleFavorite, getFavorites } from '../api/goodsApi.js';
import { deleteGoods } from '../api/goodsApi.js';
import { logout } from '../utils/auth.js';

let currentUser = null;

/* ═══════════════════════════════════════
   GSAP Animation Sequences
   ═══════════════════════════════════════ */

function initAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    // Just reveal everything instantly
    document.querySelectorAll('.hero-badge, .hero-line, .hero-desc, .hero-actions, .hero-stats, .floating-card, .feature-card, .step-card, .stats-card, .cta-card').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    document.getElementById('app').classList.add('visible');
    document.getElementById('preloader').classList.add('done');
    return;
  }

  // ── Master Timeline for Hero ──
  const heroTL = gsap.timeline({
    delay: 0.2,
    defaults: { ease: 'power3.out' }
  });

  heroTL
    // Badge slides in
    .to('#heroBadge', {
      opacity: 1, y: 0, duration: 0.6,
    })
    // Headline lines stagger in
    .to('.hero-line', {
      opacity: 1, y: 0, duration: 0.7, stagger: 0.15,
    }, '-=0.3')
    // Description fades up
    .to('#heroDesc', {
      opacity: 1, y: 0, duration: 0.6,
    }, '-=0.35')
    // Action buttons
    .to('#heroActions', {
      opacity: 1, y: 0, duration: 0.6,
    }, '-=0.3')
    // Stats bar
    .to('#heroStats', {
      opacity: 1, y: 0, duration: 0.7,
    }, '-=0.3')
    // Floating cards stagger in from right
    .to('.floating-card', {
      opacity: 1, y: 0, scale: 1,
      duration: 0.6, stagger: 0.12,
      ease: 'back.out(1.4)',
    }, '-=0.5');

  // ── Floating Cards Idle Animation ──
  gsap.to('.fc-1', { y: -8, duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.fc-2', { y: 10, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.5 });
  gsap.to('.fc-3', { y: -6, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 });
  gsap.to('.fc-4', { y: 8, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.3 });

  // ── Orb subtle drift ──
  gsap.to('.orb-1', { x: 30, y: 20, duration: 8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.orb-2', { x: -25, y: -15, duration: 10, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.orb-3', { x: 20, y: -10, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  // ── Features Section (scroll-triggered) ──
  gsap.to('.feature-card', {
    scrollTrigger: {
      trigger: '#features',
      start: 'top 75%',
      toggleActions: 'play none none none',
    },
    opacity: 1, y: 0,
    duration: 0.7, stagger: 0.12,
    ease: 'power3.out',
  });

  // ── Steps Section ──
  gsap.to('.step-card', {
    scrollTrigger: {
      trigger: '#howItWorks',
      start: 'top 75%',
      toggleActions: 'play none none none',
    },
    opacity: 1, y: 0,
    duration: 0.7, stagger: 0.2,
    ease: 'power3.out',
  });

  // Steps connecting line
  ScrollTrigger.create({
    trigger: '#howItWorks',
    start: 'top 60%',
    onEnter: () => document.getElementById('stepsLine')?.classList.add('animate'),
  });

  // ── Platform Stats ──
  gsap.to('.stats-card', {
    scrollTrigger: {
      trigger: '#platformStats',
      start: 'top 75%',
      toggleActions: 'play none none none',
    },
    opacity: 1, y: 0,
    duration: 0.8,
    ease: 'power3.out',
    onComplete: () => animateStatBars(),
  });

  // ── CTA Section ──
  gsap.to('.cta-card', {
    scrollTrigger: {
      trigger: '#ctaSection',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
    opacity: 1, y: 0,
    duration: 0.8,
    ease: 'power3.out',
  });

  // ── Product Cards ──
  ScrollTrigger.create({
    trigger: '#homeProducts',
    start: 'top 80%',
    onEnter: () => {
      gsap.from('#homeProducts .product-card', {
        opacity: 0, y: 30,
        duration: 0.5, stagger: 0.1,
        ease: 'power3.out',
      });
    },
  });
}

/* ═══════════════════════════════════════
   Counter Animation
   ═══════════════════════════════════════ */

function animateCounter(el, target, duration = 1.5) {
  const obj = { val: 0 };
  gsap.to(obj, {
    val: target,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = Math.round(obj.val);
    },
  });
}

function animateStatBars() {
  const goods = parseInt(document.getElementById('statGoods').textContent) || 0;
  const users = parseInt(document.getElementById('statUsers').textContent) || 0;
  const deals = parseInt(document.getElementById('statDeals').textContent) || 0;
  const max = Math.max(goods, users, deals, 1);

  const barGoods = document.getElementById('barGoods');
  const barUsers = document.getElementById('barUsers');
  const barDeals = document.getElementById('barDeals');

  if (barGoods) barGoods.style.width = `${Math.min((goods / max) * 100, 100)}%`;
  if (barUsers) barUsers.style.width = `${Math.min((users / max) * 100, 100)}%`;
  if (barDeals) barDeals.style.width = `${Math.min((deals / max) * 100, 100)}%`;
}

/* ═══════════════════════════════════════
   Data Loading
   ═══════════════════════════════════════ */

async function loadStats() {
  try {
    const { apiFetch } = await import('../lib/apiClient.js');
    const stats = await apiFetch('/api/stats');

    const goods = stats.goodsCount ?? 0;
    const users = stats.userCount ?? 0;
    const deals = stats.dealsCount ?? 0;

    // Animate hero counters
    animateCounter(document.getElementById('statGoods'), goods);
    animateCounter(document.getElementById('statUsers'), users);
    animateCounter(document.getElementById('statDeals'), deals);

    // Mirror to platform stats section
    animateCounter(document.getElementById('statGoods2'), goods);
    animateCounter(document.getElementById('statUsers2'), users);
    animateCounter(document.getElementById('statDeals2'), deals);

    if (currentUser) {
      const favs = await getFavorites(currentUser.id);
      animateCounter(document.getElementById('statFavs'), favs.length);
    }
  } catch (e) {
    console.error('加载统计失败', e);
  }
}

async function loadHomeProducts() {
  const grid = document.getElementById('homeProducts');
  try {
    const goods = await getLatestGoods(4);
    if (!goods.length) {
      grid.innerHTML = emptyHTML('暂无商品，快去发布第一件闲置吧！');
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

/* ═══════════════════════════════════════
   Product Interaction
   ═══════════════════════════════════════ */

function bindProductEvents(container) {
  container.querySelectorAll('.fav').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!currentUser) { toast('请先登录后再收藏'); return; }
      const id = btn.dataset.id;
      try {
        const { action } = await toggleFavorite(currentUser.id, id);
        btn.classList.toggle('active', action === 'added');
        toast(action === 'added' ? '收藏成功' : '已取消收藏');
        loadStats();
      } catch (err) { toast(err.message); }
    });
  });

  container.querySelectorAll('.view-detail, .product-img, .product-title').forEach(el => {
    el.addEventListener('click', () => openDetail(el.closest('[data-id]')?.dataset.id));
  });
}

/* ═══════════════════════════════════════
   Detail Modal
   ═══════════════════════════════════════ */

let allGoods = [];

async function openDetail(id) {
  if (!id) return;
  let p = allGoods.find(g => g.id === id);
  if (!p) {
    const { getGoodsById } = await import('../api/goodsApi.js');
    try { p = await getGoodsById(id); } catch (e) { toast('加载失败'); return; }
  }
  const modal = document.getElementById('detailModal');
  const card = document.getElementById('detailCard');
  card.innerHTML = detailModalHTML(p, currentUser?.id, currentUser?.is_admin);
  modal.classList.add('show');
  addViewHot(p.id);

  card.querySelector('#closeDetailBtn')?.addEventListener('click', () => modal.classList.remove('show'));

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
    if (!currentUser) { toast('请先登录'); return; }
    addContactHot(p.id);
    const sellerId = card.querySelector('#contactSellerBtn').dataset.seller;
    window.location.href = `/messages.html?to=${sellerId}`;
  });

  if (currentUser) {
    import('../api/goodsApi.js').then(m => m.isFavorite(currentUser.id, p.id)).then(fav => {
      if (fav) card.querySelector('#toggleFavBtn').textContent = '取消收藏';
    }).catch(() => {});
  }

  card.querySelector('#toggleFavBtn')?.addEventListener('click', async () => {
    if (!currentUser) { toast('请先登录后再收藏'); return; }
    try {
      const { action } = await toggleFavorite(currentUser.id, p.id);
      card.querySelector('#toggleFavBtn').textContent = action === 'added' ? '取消收藏' : '收藏商品';
      toast(action === 'added' ? '收藏成功' : '已取消收藏');
      if (action === 'added') addFavHot(p.id);
      document.querySelector(`.fav[data-id="${p.id}"]`)?.classList.toggle('active', action === 'added');
    } catch (e) { toast(e.message); }
  });

  card.querySelector('#deleteGoodsBtn')?.addEventListener('click', async () => {
    if (!confirm('确定删除这个商品吗？')) return;
    try {
      await deleteGoods(p.id);
      modal.classList.remove('show');
      toast('商品已删除');
      loadHomeProducts();
    } catch (e) { toast(e.message); }
  });

  card.querySelector('#buyGoodsBtn')?.addEventListener('click', async () => {
    if (!currentUser) { toast('请先登录'); return; }
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
        loadHomeProducts();
      }
    });
  });

  card.querySelector('#adminDeleteGoodsBtn')?.addEventListener('click', () => {
    showAdminDeleteModal(p.id, async (reason) => {
      const { apiFetch } = await import('../lib/apiClient.js');
      await apiFetch(`/api/admin/goods/${p.id}`, { method: 'DELETE', body: { reason } });
      modal.classList.remove('show');
      toast('商品已下架并通知卖家');
      loadHomeProducts();
    });
  });
}

function bindDetailModal() {
  document.getElementById('detailModal')?.addEventListener('click', e => {
    if (e.target.id === 'detailModal') e.target.classList.remove('show');
  });
}

/* ═══════════════════════════════════════
   Preloader → Init
   ═══════════════════════════════════════ */

async function init() {
  // Show app, hide preloader
  setTimeout(() => {
    document.getElementById('app').classList.add('visible');
    document.getElementById('preloader').classList.add('done');
  }, 1500);

  currentUser = await renderNavUser();

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await logout();
    window.location.reload();
  });

  // Load data
  await Promise.all([loadStats(), loadHomeProducts()]);

  // Init GSAP animations
  initAnimations();

  // Bind modals
  bindDetailModal();
}

init();
