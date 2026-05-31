/**
 * pages/splash.js — 校易通启动页
 * GSAP-powered particle background + scroll animations
 */

/* ═══════════════════════════════════════════
   PARTICLE CANVAS BACKGROUND
   Represents the "network" of campus connections
   ═══════════════════════════════════════════ */
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: -1000, y: -1000 };
let w, h;

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => {
  resize();
  initParticles();
});

function initParticles() {
  const count = Math.min(Math.floor((w * h) / 12000), 100);
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.15,
      color: Math.random() < 0.5 ? '99,102,241' : '34,211,238',
    });
  }
}
initParticles();

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
document.addEventListener('mouseleave', () => {
  mouse.x = -1000;
  mouse.y = -1000;
});

function drawParticles() {
  ctx.clearRect(0, 0, w, h);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -20) p.x = w + 20;
    if (p.x > w + 20) p.x = -20;
    if (p.y < -20) p.y = h + 20;
    if (p.y > h + 20) p.y = -20;

    // Subtle mouse attraction
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 180 && dist > 0) {
      p.vx += (dx / dist) * 0.015;
      p.vy += (dy / dist) * 0.015;
      p.vx *= 0.998;
      p.vy *= 0.998;
    }

    // Draw particle
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
    ctx.fill();

    // Draw connections to nearby particles
    for (let j = i + 1; j < particles.length; j++) {
      const p2 = particles[j];
      const dx2 = p.x - p2.x;
      const dy2 = p.y - p2.y;
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (dist2 < 140) {
        const lineAlpha = (1 - dist2 / 140) * 0.12;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(drawParticles);
}
drawParticles();

/* ═══════════════════════════════════════════
   GSAP ANIMATIONS
   ═══════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) {
  // Show everything instantly for accessibility
  document.querySelectorAll('.hero-badge, .hero-headline .line, .hero-desc, .hero-actions, .floating-card, .stats-card, .adv-card, .step-card, .cta-card').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  document.getElementById('stepsTrack')?.classList.add('visible');
} else {
  initAnimations();
}

function initAnimations() {
  // ── Hero Entrance Timeline ──
  const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });

  heroTL
    .to('#heroBadge', {
      opacity: 1, y: 0, duration: 0.6,
    })
    .to('.hero-headline .line', {
      opacity: 1, y: 0, duration: 0.75, stagger: 0.18,
    }, '-=0.3')
    .to('#heroDesc', {
      opacity: 1, y: 0, duration: 0.6,
    }, '-=0.4')
    .to('#heroActions', {
      opacity: 1, y: 0, duration: 0.6,
    }, '-=0.3')
    .to('.floating-card', {
      opacity: 1, y: 0, scale: 1,
      duration: 0.7, stagger: 0.12,
      ease: 'back.out(1.5)',
    }, '-=0.5');

  // ── Floating Cards Idle Bob ──
  gsap.to('.fc-1', { y: -7, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.5 });
  gsap.to('.fc-2', { y: 9, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.9 });
  gsap.to('.fc-3', { y: -5, duration: 3.0, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.3 });
  gsap.to('.fc-4', { y: 7, duration: 3.5, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.7 });

  // ── Hero Orbs Parallax Drift ──
  gsap.to('.hero-orb.indigo', { x: 40, y: -25, duration: 10, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.hero-orb.cyan', { x: -35, y: 20, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  // ── Stats Section ──
  ScrollTrigger.create({
    trigger: '#stats',
    start: 'top 75%',
    onEnter: () => {
      gsap.to('#statsCard', {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        onComplete: animateStats,
      });
    },
    once: true,
  });

  // ── Advantages Cards ──
  ScrollTrigger.create({
    trigger: '#advantages',
    start: 'top 72%',
    onEnter: () => {
      gsap.to('.adv-card', {
        opacity: 1, y: 0,
        duration: 0.65, stagger: 0.1,
        ease: 'power3.out',
      });
    },
    once: true,
  });

  // ── Steps Section ──
  ScrollTrigger.create({
    trigger: '#howItWorks',
    start: 'top 72%',
    onEnter: () => {
      document.getElementById('stepsTrack')?.classList.add('visible');
      gsap.to('.step-card', {
        opacity: 1, y: 0,
        duration: 0.65, stagger: 0.18,
        ease: 'power3.out',
      });
    },
    once: true,
  });

  // ── CTA Section ──
  ScrollTrigger.create({
    trigger: '#cta',
    start: 'top 80%',
    onEnter: () => {
      gsap.to('#ctaCard', {
        opacity: 1, y: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    },
    once: true,
  });
}

/* ═══════════════════════════════════════════
   STATS: Counter Animation + Bar Fill
   ═══════════════════════════════════════════ */
function animateStats() {
  fetch('/api/stats')
    .then(res => res.json())
    .then(data => {
      const goods = data.goodsCount || 0;
      const users = data.userCount || 0;
      const deals = data.dealsCount || 0;
      animateCounter('counterGoods', goods);
      animateCounter('counterUsers', users);
      animateCounter('counterDeals', deals);
      animateBars(goods, users, deals);
    })
    .catch(() => {
      animateCounter('counterGoods', 128);
      animateCounter('counterUsers', 356);
      animateCounter('counterDeals', 89);
      animateBars(128, 356, 89);
    });
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const obj = { val: 0 };
  gsap.to(obj, {
    val: target,
    duration: 2,
    ease: 'power2.out',
    onUpdate: () => { el.textContent = Math.round(obj.val); },
  });
}

function animateBars(goods, users, deals) {
  const max = Math.max(goods, users, deals, 1);
  setTimeout(() => {
    const barGoods = document.getElementById('barGoods');
    const barUsers = document.getElementById('barUsers');
    const barDeals = document.getElementById('barDeals');
    if (barGoods) barGoods.style.width = (goods / max * 100) + '%';
    if (barUsers) barUsers.style.width = (users / max * 100) + '%';
    if (barDeals) barDeals.style.width = (deals / max * 100) + '%';
  }, 300);
}

/* ═══════════════════════════════════════════
   PARALLAX ON SCROLL
   ═══════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const visual = document.getElementById('heroVisual');
  if (visual) {
    visual.style.transform = `translateY(${scrollY * 0.08}px)`;
  }
  const indicator = document.querySelector('.scroll-indicator');
  if (indicator) {
    indicator.style.opacity = Math.max(0, 1 - scrollY / 300);
  }
}, { passive: true });
