/**
 * pages/admin-login.js — 管理员登录逻辑
 */

const emailInput = document.getElementById('adminEmail');
const passInput  = document.getElementById('adminPassword');
const errorEl    = document.getElementById('adminError');
const btn        = document.getElementById('adminLoginBtn');

function showError(msg) { errorEl.textContent = msg; errorEl.style.display = ''; }

function toast(text) {
  const box = document.getElementById('toast');
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.textContent = text;
  box.appendChild(item);
  setTimeout(() => item.remove(), 2200);
}

btn.addEventListener('click', async () => {
  errorEl.style.display = 'none';
  const email = emailInput.value.trim();
  const password = passInput.value;
  if (!email || !password) { showError('请填写邮箱和密码'); return; }

  btn.disabled = true;
  btn.textContent = '登录中…';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');
    if (!data.user?.is_admin) throw new Error('该账号不具备管理员权限');
    localStorage.setItem('xiaoyitong_token', data.token);
    toast('管理员登录成功');
    setTimeout(() => { window.location.href = '/market.html'; }, 600);
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '管理员登录';
  }
});

passInput.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
