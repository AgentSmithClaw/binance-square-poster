#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { DATA_DIR, loadConfig, readJsonIfExists, writeJson } = require('./config-utils');
const stateManager = require('./state-manager');

const HOT_POSTS_PATH = path.join(DATA_DIR, 'hot-posts.json');
const GENERATED_HOT_POST_PATH = path.join(DATA_DIR, 'generated-hot-post.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'related-images.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const DEFAULT_MAX_DOWNLOADS = 3;
const DEFAULT_TIMEOUT_MS = 30000;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeToken(value, fallback = 'asset') {
  const normalized = String(value || fallback).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return normalized || fallback;
}

function guessExtension(contentType, url) {
  const byType = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  if (contentType && byType[String(contentType).toLowerCase()]) {
    return byType[String(contentType).toLowerCase()];
  }

  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    if (ext && ext.length <= 5) return ext;
  } catch (_) {
    return '.jpg';
  }
  return '.jpg';
}

function extractSymbols(text) {
  return Array.from(new Set((String(text || '').match(/\$[A-Z0-9]{2,10}/g) || []).map(item => item.toUpperCase())));
}

function resolvePreferredSymbols() {
  const generated = readJsonIfExists(GENERATED_HOT_POST_PATH);
  const latestHotDraft = stateManager.getLatestPendingPost(null, { threadPrefix: 'hot-' });
  const generatedSymbols = (generated?.context?.topSymbols || []).map(item => String(item).toUpperCase());
  const draftSymbols = extractSymbols(latestHotDraft?.postContent || '');
  return Array.from(new Set([...draftSymbols, ...generatedSymbols]));
}

function collectCandidates(hotData, preferredSources, preferredSymbols) {
  const merged = [];
  const sourceOrder = new Map(preferredSources.map((item, index) => [item, index]));

  const pushCandidate = (candidate, post = null) => {
    if (!candidate?.url) return;
    merged.push({
      type: candidate.type || 'unknown',
      url: candidate.url,
      score: Number(candidate.score || 0),
      symbol: candidate.symbol || post?.symbols?.[0] || null,
      sourcePostId: candidate.sourcePostId || post?.postId || null,
      sourcePostUrl: candidate.sourcePage || post?.postUrl || null,
      sourcePostTitle: post?.title || null,
      authorName: post?.authorName || null,
      finalScore: Number(post?.finalScore || 0),
      hasCompleteTradeSetup: Boolean(post?.hasCompleteTradeSetup),
      sourcePriority: sourceOrder.has(candidate.type) ? sourceOrder.get(candidate.type) : preferredSources.length + 1,
      symbolPriority: preferredSymbols.includes(String(candidate.symbol || '').toUpperCase()) ? 0 : 1
    });
  };

  for (const post of hotData.posts || []) {
    for (const candidate of post.relatedImageCandidates || []) {
      pushCandidate(candidate, post);
    }
  }

  for (const candidate of hotData.imageCandidates || []) {
    pushCandidate(candidate, null);
  }

  const seen = new Set();
  return merged
    .filter(item => {
      const key = item.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.symbolPriority !== b.symbolPriority) return a.symbolPriority - b.symbolPriority;
      if (a.sourcePriority !== b.sourcePriority) return a.sourcePriority - b.sourcePriority;
      if (b.hasCompleteTradeSetup !== a.hasCompleteTradeSetup) return Number(b.hasCompleteTradeSetup) - Number(a.hasCompleteTradeSetup);
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return b.score - a.score;
    });
}

async function downloadImage(candidate, index) {
  const response = await fetch(candidate.url, {
    headers: {
      'user-agent': 'Mozilla/5.0 Codex Binance Square Poster'
    },
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Unexpected content-type: ${contentType}`);
  }

  const ext = guessExtension(contentType, candidate.url);
  const symbol = sanitizeToken((candidate.symbol || '').replace('$', ''), 'market');
  const baseName = `${String(index + 1).padStart(2, '0')}-${sanitizeToken(candidate.type, 'image')}-${symbol}`;
  const fileName = `${baseName}${ext}`;
  const filePath = path.join(IMAGES_DIR, fileName);
  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

  return {
    ...candidate,
    fileName,
    filePath,
    contentType,
    downloadedAt: new Date().toISOString(),
    sizeBytes: fs.statSync(filePath).size
  };
}

async function main() {
  const config = loadConfig();
  const imagesConfig = config.square?.images || {};
  const hotData = readJsonIfExists(HOT_POSTS_PATH);

  if (!hotData?.posts?.length) {
    throw new Error('No hot post data found. Run node index.js --hot-posts first.');
  }

  ensureDir(IMAGES_DIR);

  const preferredSources = Array.isArray(imagesConfig.preferredSources) && imagesConfig.preferredSources.length
    ? imagesConfig.preferredSources
    : ['symbol-logo', 'post-image', 'chain-logo'];
  const preferredSymbols = resolvePreferredSymbols();
  const maxDownloads = Number(imagesConfig.maxDownloads || DEFAULT_MAX_DOWNLOADS);
  const candidates = collectCandidates(hotData, preferredSources, preferredSymbols).slice(0, Math.max(1, maxDownloads * 2));

  const downloaded = [];
  const errors = [];

  for (const [index, candidate] of candidates.entries()) {
    if (downloaded.length >= maxDownloads) break;
    try {
      downloaded.push(await downloadImage(candidate, downloaded.length));
    } catch (error) {
      errors.push({ url: candidate.url, reason: error.message, type: candidate.type, symbol: candidate.symbol || null });
    }
  }

  if (!downloaded.length) {
    throw new Error(`Unable to download any related images. ${errors[0]?.reason || 'No candidates succeeded.'}`);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFetchedAt: hotData.fetchedAt,
    source: hotData.source,
    preferredSources,
    preferredSymbols,
    maxDownloads,
    selected: downloaded,
    candidates,
    errors
  };

  writeJson(OUTPUT_PATH, output);

  console.log(`Saved ${downloaded.length} related images to ${IMAGES_DIR}`);
  downloaded.forEach((item, index) => {
    console.log(`${index + 1}. ${item.type} ${item.symbol || ''} -> ${item.filePath}`.trim());
  });
  if (errors.length) {
    console.log(`Skipped ${errors.length} image candidates that could not be downloaded.`);
  }
}

main().catch(error => {
  console.error('Failed to find related images:', error.message);
  process.exit(1);
});
