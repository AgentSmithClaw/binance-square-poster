const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(__dirname, '..', 'state');
const STATE_FILE = path.join(STATE_DIR, 'pending-posts.json');
const DEFAULT_TTL_MS = 30 * 60 * 1000;

if (!fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getKey(groupId, threadId = 'default') {
  return `${groupId}:${threadId}`;
}

function parseKey(key) {
  const index = key.indexOf(':');
  if (index === -1) {
    return { groupId: key, threadId: 'default' };
  }
  return {
    groupId: key.slice(0, index),
    threadId: key.slice(index + 1)
  };
}

function isExpired(record) {
  return Boolean(record?.expiresAt && Date.now() > record.expiresAt);
}

function normalizeRecord(key, record) {
  const { groupId, threadId } = parseKey(key);
  return {
    key,
    groupId,
    threadId,
    postContent: record.postContent || null,
    pendingCheck: record.pendingCheck || null,
    status: record.status || 'idle',
    createdAt: record.createdAt || 0,
    updatedAt: record.updatedAt || null,
    expiresAt: record.expiresAt || null
  };
}

function getPendingPost(groupId, threadId = 'default') {
  const state = loadState();
  const key = getKey(groupId, threadId);
  const record = state[key];

  if (!record) return null;
  if (isExpired(record)) {
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

function listPendingPosts(groupId = null) {
  const state = loadState();
  let changed = false;
  const items = [];

  for (const [key, record] of Object.entries(state)) {
    if (isExpired(record)) {
      delete state[key];
      changed = true;
      continue;
    }

    const item = normalizeRecord(key, record);
    if (!groupId || item.groupId === groupId) {
      items.push(item);
    }
  }

  if (changed) {
    saveState(state);
  }

  return items.sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
}

function getLatestPendingPost(groupId = null, options = {}) {
  const { threadPrefix = null } = options;
  const items = listPendingPosts(groupId).filter(item => {
    if (!threadPrefix) {
      return true;
    }
    return item.threadId.startsWith(threadPrefix);
  });
  return items[0] || null;
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

function setNewsLocked(groupId, version, threadId = 'default') {
  const state = loadState();
  const key = getKey(groupId, threadId);
  state[key] = state[key] || {};
  state[key].newsLockedVersion = version;
  state[key].newsVerifiedAt = Date.now();
  saveState(state);
  return true;
}

function setTaFetched(groupId, threadId = 'default') {
  const state = loadState();
  const key = getKey(groupId, threadId);
  state[key] = state[key] || {};
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
  if (isExpired(record)) {
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
    if (state[key]?.expiresAt && now > state[key].expiresAt) {
      delete state[key];
      changed = true;
    }
  }

  if (changed) {
    saveState(state);
  }
}

const cleanupTimer = setInterval(cleanupExpired, 5 * 60 * 1000);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

module.exports = {
  getPendingPost,
  listPendingPosts,
  getLatestPendingPost,
  setPendingPost,
  clearPendingPost,
  updateStatus,
  getStatus,
  cleanupExpired,
  setNewsLocked,
  setTaFetched,
  DEFAULT_TTL_MS
};
