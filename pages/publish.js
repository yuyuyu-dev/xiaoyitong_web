/**
 * pages/publish.js — 发布闲置页逻辑
 */

import { requireAuth }         from '../utils/auth.js';
import { renderNavUser, toast } from '../utils/ui.js';
import { validatePublishForm }  from '../utils/validate.js';
import { publishGoods }         from '../api/goodsApi.js';

let currentUser = null;
let selectedFile = null;

async function init() {
  currentUser = await renderNavUser();

  // 未登录强制跳转
  if (!currentUser) {
    toast('请先登录后再发布商品');
    setTimeout(() => { window.location.href = '/login.html'; }, 800);
    return;
  }

  // 图片预览
  document.getElementById('imageInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('图片不能超过 5MB'); return; }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('previewImg').src = reader.result;
      document.getElementById('uploadBox').classList.add('has-img');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('publishBtn').addEventListener('click', handlePublish);
}

async function handlePublish() {
  const title     = document.getElementById('publishTitle').value.trim();
  const price     = document.getElementById('publishPrice').value;
  const category  = document.getElementById('publishCategory').value;
  const condition = document.getElementById('publishCondition').value;
  const location  = document.getElementById('publishLocation').value.trim();
  const description = document.getElementById('publishDesc').value.trim();

  const check = validatePublishForm({ title, price, location, desc: description });
  if (!check.valid) { toast(check.message); return; }

  const btn = document.getElementById('publishBtn');
  btn.disabled = true;
  btn.textContent = '发布中…';

  // 显示进度条
  const progressWrap = document.getElementById('uploadProgress');
  const progressBar  = document.getElementById('uploadProgressBar');
  if (selectedFile) {
    progressWrap.classList.add('show');
    // 模拟进度（真实上传在 publishGoods 内部完成）
    let pct = 0;
    const ticker = setInterval(() => {
      pct = Math.min(pct + 10, 85);
      progressBar.style.width = pct + '%';
    }, 120);

    try {
      await publishGoods({
        title, price, category, condition, location, description,
        imageFile: selectedFile,
        sellerId: currentUser.id
      });
      clearInterval(ticker);
      progressBar.style.width = '100%';
    } catch (e) {
      clearInterval(ticker);
      progressWrap.classList.remove('show');
      toast(e.message);
      btn.disabled = false;
      btn.textContent = '确认发布';
      return;
    }
  } else {
    try {
      await publishGoods({
        title, price, category, condition, location, description,
        imageFile: null,
        sellerId: currentUser.id
      });
    } catch (e) {
      toast(e.message);
      btn.disabled = false;
      btn.textContent = '确认发布';
      return;
    }
  }

  toast('发布成功，已上架到二手市场！');
  setTimeout(() => { window.location.href = '/market.html'; }, 800);
}

init();
