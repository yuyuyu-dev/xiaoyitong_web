/**
 * pages/messages.js — 私信中心逻辑
 */

import { renderNavUser, toast, esc, timeAgo, emptyHTML } from '../utils/ui.js';
import { getConversationList, getConversation, sendMessage, markMessagesRead } from '../api/userApi.js';

let currentUser   = null;
let activeChatId  = null;   // 当前会话对方 ID

async function init() {
  currentUser = await renderNavUser();

  if (!currentUser) {
    toast('请先登录后查看私信');
    setTimeout(() => { window.location.href = '/login.html'; }, 800);
    return;
  }

  // 标记已读
  markMessagesRead().catch(() => {});

  // URL 参数 ?to=xxx 自动打开与某人的会话，?msg=xxx 自动发送消息
  const params = new URLSearchParams(window.location.search);
  const toId   = params.get('to');
  const autoMsg = params.get('msg');
  if (toId) activeChatId = toId;

  await loadConversationList();

  // 自动发送预设消息
  if (autoMsg && activeChatId) {
    try {
      await sendMessage(activeChatId, decodeURIComponent(autoMsg));
      await loadChatWindow();
      await loadConversationList();
    } catch (e) { console.error('自动发送消息失败', e); }
    // 清除 URL 参数避免刷新重复发送
    history.replaceState(null, '', '/messages.html');
  }

  document.getElementById('sendBtn').addEventListener('click', handleSend);
  document.getElementById('messageInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
}

async function loadConversationList() {
  const listEl = document.getElementById('conversationList');
  try {
    const list = await getConversationList();

    if (!list.length) {
      listEl.innerHTML = emptyHTML('暂无会话');
      return;
    }

    // 如果没有默认会话，选第一个
    if (!activeChatId) activeChatId = list[0].otherId;

    listEl.innerHTML = list.map(item => `
      <div class="conversation ${item.otherId === activeChatId ? 'active' : ''}" data-id="${esc(item.otherId)}">
        <strong>${esc(item.otherName)}</strong>
        <span>${esc(item.lastMessage)}</span>
      </div>
    `).join('');

    listEl.querySelectorAll('.conversation').forEach(el => {
      el.addEventListener('click', async () => {
        activeChatId = el.dataset.id;
        listEl.querySelectorAll('.conversation').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        await loadChatWindow();
      });
    });

    await loadChatWindow();
  } catch (e) {
    listEl.innerHTML = emptyHTML('加载失败');
    console.error(e);
  }
}

async function loadChatWindow() {
  if (!activeChatId) return;
  const headerEl = document.getElementById('chatHeader');
  const boxEl    = document.getElementById('messagesBox');

  try {
    const msgs = await getConversation(activeChatId);

    // 获取对方名字（从会话列表或从消息里取）
    const otherName = msgs[0]
      ? (msgs[0].from_id === currentUser.id ? msgs[0].to?.nickname : msgs[0].from?.nickname) ?? '对方'
      : '对方';
    headerEl.textContent = `和 ${otherName} 的聊天`;

    if (!msgs.length) {
      boxEl.innerHTML = emptyHTML('还没有消息，先打个招呼吧');
      return;
    }

    boxEl.innerHTML = msgs.map(m => `
      <div class="msg ${m.from_id === currentUser.id ? 'me' : 'other'}">
        ${esc(m.content)}
        <div class="msg-time">${timeAgo(m.created_at)}</div>
      </div>
    `).join('');

    boxEl.scrollTop = boxEl.scrollHeight;
  } catch (e) {
    console.error(e);
  }
}

async function handleSend() {
  const input = document.getElementById('messageInput');
  const text  = input.value.trim();
  if (!text) return;
  if (!activeChatId) { toast('请先选择一个会话'); return; }

  try {
    await sendMessage(activeChatId, text);
    input.value = '';
    await loadChatWindow();
    await loadConversationList();
  } catch (e) {
    toast(e.message);
  }
}

init();
