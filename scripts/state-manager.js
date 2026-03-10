/**
 * 加密货币日报状态管理器
 * 按 group_id + thread_id 隔离状态
 */

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(__dirname, '..', 'state');
const STATE_FILE = path.join(STATE_DIR, 'pending-posts.json');

// 确保状态目录存在
if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

// 状态默认过期时间：30分钟
const DEFAULT_TTL_MS = 30 * 60 * 1000;

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getKey(groupId, threadId = 'default') {
  return `${groupId}:${threadId}`;
}

function getPendingPost(groupId, threadId = 'default') {
  const state = loadState();
  const key = getKey(groupId, threadId);
  const record = state[key];
  
  if (!record) return null;
  
  if (record.expiresAt && Date.now() > record.expiresAt) {
    delete state[key];
    saveState(state);
    return null;
  }
  
  return {
    postContent: record.postContent || null,
    pendingCheck: record.pendingCheck || null,
    status: record.status || 'idle'
  };
}

function setPendingPost(groupId, postContent, threadId = 'default', ttlMs = DEFAULT_TTL_MS, pendingCheck = null) {
  const state = loadState();
  const key = getKey(groupId, threadId);
  
  state[key] = {
    postContent,
    pendingCheck,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    status: 'waiting_confirm'
  };
  
  saveState(state);
  return true;
}

/**
 * 锁定资讯版本
 */
function setNewsLocked(groupId, version, threadId = 'default') {
  const state = loadState();
  const key = getKey(groupId, threadId);
  
  if (!state[key]) {
    state[key] = {};
  }
  
  state[key].newsLockedVersion = version;
  state[key].newsVerifiedAt = Date.now();
  
  saveState(state);
  return true;
}

/**
 * 记录技术面数据获取时间
 */
function setTaFetched(groupId, threadId = 'default') {
  const state = loadState();
  const key = getKey(groupId, threadId);
  
  if (!state[key]) {
    state[key] = {};
  }
  
  state[key].taFetchedAt = Date.now();
  state[key].taIsFresh = true;
  
  saveState(state);
  return true;
}

function clearPendingPost(groupId, threadId = 'default') {
  const state = loadState();
  const key = getKey(groupId, threadId);
  
  if (state[key]) {
    delete state[key];
    saveState(state);
  }
  return true;
}

function updateStatus(groupId, threadId, status) {
  const state = loadState();
  const key = getKey(groupId, threadId);
  
  if (state[key]) {
    state[key].status = status;
    state[key].updatedAt = Date.now();
    saveState(state);
  }
  return true;
}

function getStatus(groupId, threadId = 'default') {
  const state = loadState();
  const key = getKey(groupId, threadId);
  const record = state[key];
  
  if (!record) return null;
  
  if (record.expiresAt && Date.now() > record.expiresAt) {
    delete state[key];
    saveState(state);
    return null;
  }
  
  return record;
}

function cleanupExpired() {
  const state = loadState();
  const now = Date.now();
  let changed = false;
  
  for (const key of Object.keys(state)) {
    if (state[key].expiresAt && now > state[key].expiresAt) {
      delete state[key];
      changed = true;
    }
  }
  
  if (changed) {
    saveState(state);
  }
}

setInterval(cleanupExpired, 5 * 60 * 1000);

module.exports = {
  getPendingPost,
  setPendingPost,
  clearPendingPost,
  updateStatus,
  getStatus,
  cleanupExpired,
  setNewsLocked,
  setTaFetched,
  DEFAULT_TTL_MS
};
