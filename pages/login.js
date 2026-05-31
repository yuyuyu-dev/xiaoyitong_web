/**
 * pages/login.js — 登录 / 注册页逻辑
 */

import { login, requestRegisterCode, confirmRegisterCode, resendRegisterCode, getCurrentUser } from '../utils/auth.js';
import { validateRegisterForm, validateRegisterSendCode }                                    from '../utils/validate.js';
import { toast }                                                                             from '../utils/ui.js';

let mode = 'login'; // 'login' | 'register'
let codeSent = false;
let resendCountdown = 0;
let resendTimer = null;

async function init() {
  // 已登录则直接跳转
  const user = await getCurrentUser();
  if (user) {
    window.location.href = '/user-center.html';
    return;
  }

  document.getElementById('authSwitchBtn').addEventListener('click', toggleMode);
  document.getElementById('authBtn').addEventListener('click', handleSubmit);
  document.getElementById('sendCodeBtn').addEventListener('click', handleSendCode);

  // 回车提交
  document.getElementById('authPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSubmit();
  });
}

function updateRegisterUi() {
  const isRegister = mode === 'register';
  document.getElementById('authTitle').textContent       = isRegister ? '注册账号'  : '登录账号';
  document.getElementById('authDesc').textContent        = isRegister
    ? '注册时先发送邮箱验证码，收到后输入即可完成注册。登录时只需邮箱和密码。'
    : '请输入邮箱和密码登录。';
  document.getElementById('authBtn').textContent         = isRegister ? '注册并登录' : '登录';
  document.getElementById('authSwitchText').textContent  = isRegister ? '已有账号？' : '还没有账号？';
  document.getElementById('authSwitchBtn').textContent   = isRegister ? '去登录'    : '去注册';

  document.getElementById('nicknameField').style.display         = isRegister ? '' : 'none';
  document.getElementById('schoolField').style.display           = isRegister ? '' : 'none';
  document.getElementById('confirmPasswordField').style.display  = isRegister ? '' : 'none';
  document.getElementById('authCodeRow').style.display          = isRegister ? '' : 'none';

  if (!isRegister) {
    clearResendTimer();
    codeSent = false;
  }
}

function toggleMode() {
  mode = mode === 'login' ? 'register' : 'login';
  updateRegisterUi();
  hideError();
}

function clearResendTimer() {
  if (resendTimer) {
    clearInterval(resendTimer);
    resendTimer = null;
  }
  resendCountdown = 0;
  const sendCodeBtn = document.getElementById('sendCodeBtn');
  if (sendCodeBtn) {
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = '发送验证码';
  }
  const codeTip = document.getElementById('codeTip');
  if (codeTip) codeTip.style.display = 'none';
}

function startResendTimer() {
  clearResendTimer();
  resendCountdown = 120;
  const sendCodeBtn = document.getElementById('sendCodeBtn');
  const codeTip = document.getElementById('codeTip');
  if (codeTip) {
    codeTip.style.display = 'block';
    codeTip.textContent = '验证码已发送，2 分钟后可重发。';
  }
  if (sendCodeBtn) {
    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = `${resendCountdown}s后可重发`;
  }
  resendTimer = setInterval(() => {
    resendCountdown -= 1;
    if (sendCodeBtn) {
      sendCodeBtn.textContent = resendCountdown > 0
        ? `${resendCountdown}s后可重发`
        : '重新发送验证码';
      sendCodeBtn.disabled = resendCountdown > 0;
    }
    if (resendCountdown <= 0) {
      clearResendTimer();
    }
  }, 1000);
}

async function handleSendCode() {
  hideError();

  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const confirmPassword = document.getElementById('authConfirmPassword')?.value || '';
  const nickname = document.getElementById('authNickname').value.trim();
  const school   = document.getElementById('authSchool').value.trim();

  const check = validateRegisterSendCode({ email, password, confirmPassword, nickname, school });
  if (!check.valid) { showError(check.message); return; }

  const btn = document.getElementById('sendCodeBtn');
  btn.disabled = true;
  btn.textContent = '发送中…';

  try {
    await requestRegisterCode(email, password, nickname, school);
    toast('验证码已发送，请查收邮箱。');
    codeSent = true;
    startResendTimer();
  } catch (e) {
    if (e.message?.includes('already registered')) {
      try {
        await resendRegisterCode(email);
        toast('验证码已重新发送，请查收邮箱。');
        codeSent = true;
        startResendTimer();
      } catch (resendError) {
        showError(resendError.message);
      }
    } else {
      showError(e.message);
    }
  } finally {
    if (btn && !resendTimer) {
      btn.disabled = false;
      btn.textContent = '发送验证码';
    }
  }
}

async function handleSubmit() {
  hideError();
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn      = document.getElementById('authBtn');

  btn.disabled = true;
  btn.textContent = '处理中…';

  try {
    if (mode === 'login') {
      await login(email, password);
      toast('登录成功，欢迎回来！');
      setTimeout(() => { window.location.href = '/index.html'; }, 600);

    } else {
      const nickname = document.getElementById('authNickname').value.trim();
      const school   = document.getElementById('authSchool').value.trim();
      const confirmPassword = document.getElementById('authConfirmPassword')?.value || '';
      const code = document.getElementById('authCode').value.trim();

      const check = validateRegisterForm({ email, password, confirmPassword, nickname, school, code });
      if (!check.valid) { showError(check.message); return; }
      if (!codeSent) { showError('请先发送验证码并填写邮箱中的验证码'); return; }

      await confirmRegisterCode(email, code);

      toast('注册成功，已登录！');
      setTimeout(() => { window.location.href = '/index.html'; }, 600);
    }
  } catch (e) {
    showError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = mode === 'login' ? '登录' : '注册并登录';
  }
}

function showError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}
function hideError() {
  const el = document.getElementById('authError');
  if (el) el.style.display = 'none';
}

init();
