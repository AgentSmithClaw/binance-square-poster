#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { loadConfig, DATA_DIR, writeJson } = require('./config-utils');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  console.error('Playwright is required for Binance Square scraping:', error.message);
  process.exit(1);
}

const OUTPUT_PATH = path.join(DATA_DIR, 'hot-posts.json');
const STATE_PATH = path.join(DATA_DIR, 'binance-state.json');

const INCLUDE_PATTERNS = [
  /\$[A-Z0-9]{2,10}/,
  /bitcoin/i,
  /ethereum/i,
  /crypto/i,
  /binance/i,
  /stablecoin/i,
  /wallet/i,
  /etf/i,
  /btc/i,
  /eth/i,
  /sol/i,
  /xrp/i,
  /ltc/i,
  /doge/i,
  /ada/i,
  /\u6bd4\u7279\u5e01/u,
  /\u4ee5\u592a\u574a/u,
  /\u52a0\u5bc6/u,
  /\u5e01\u5708/u,
  /\u5408\u7ea6/u,
  /\u7206\u4ed3/u,
  /\u5de8\u9cb8/u,
  /\u6760\u6746/u,
  /\u505a\u591a/u,
  /\u505a\u7a7a/u,
  /\u591a\u5355/u,
  /\u7a7a\u5355/u
];

const EXCLUDE_PATTERNS = [
  /\u538b\u5c81\u94b1/u,
  /\u7ea2\u5305/u,
  /\u4fc4\u7f57\u65af/u,
  /\u5bfc\u5f39/u,
  /\u539f\u6cb9/u,
  /\u9ec4\u91d1/u,
  /\u5e7f\u4e1c/u,
  /\u6d59\u6c5f/u,
  /\u5317\u4eac/u,
  /\u65b0\u52a0\u5761/u,
  /\u5de5\u8d44/u,
  /\u7ade\u9009/u,
  /\u603b\u7edf/u,
  /\u6cb9\u4ef7/u,
  /\u7f8e\u56fd/u,
  /\u9f99\u867e/u,
  /\u8865\u8d34/u
];

const MARKET_CONTEXT_PATTERNS = [
  /\u5408\u7ea6/u,
  /\u7206\u4ed3/u,
  /\u6b62\u635f/u,
  /\u538b\u529b/u,
  /\u652f\u6491/u,
  /\u7a81\u7834/u,
  /\u56de\u8e29/u,
  /\u53cd\u5f39/u,
  /\u9707\u8361/u,
  /\u505a\u591a/u,
  /\u505a\u7a7a/u,
  /\u591a\u5355/u,
  /\u7a7a\u5355/u,
  /\u4ed3\u4f4d/u,
  /\u60c5\u7eea/u,
  /\u8d44\u91d1/u,
  /\u6210\u4ea4/u,
  /\u4ef7\u683c/u,
  /\u5e02\u573a/u,
  /\u5e01\u4ef7/u,
  /\u6760\u6746/u,
  /\u5de8\u9cb8/u,
  /price/i,
  /market/i,
  /breakout/i,
  /support/i,
  /resistance/i,
  /long/i,
  /short/i,
  /liquidation/i,
  /volume/i
];

const BAD_SYMBOLS = new Set(['FUTURE', 'BTCUSDT', 'ETHUSDT', 'USDT', 'USD', 'QC', 'FLOWUSDT', 'WEB3']);
const BAD_HASHTAG_PATTERNS = [/\u80af\u5c3c\u8fea/u, /\u6cb9\u4ef7/u, /\u603b\u7edf/u, /\u539f\u6cb9/u, /\u7ade\u9009/u, /\u7f8e\u56fd/u];

function getSymbolPool(config) {
  const mode = config.square?.symbolPool?.mode || 'allowlist';
  const allowlist = new Set((config.square?.symbolPool?.allowlist || []).map(item => String(item).toUpperCase()));
  const denylist = new Set((config.square?.symbolPool?.denylist || []).map(item => String(item).toUpperCase()));
  return { mode, allowlist, denylist };
}

function isAllowedSymbol(symbol, pool) {
  const normalized = String(symbol || '').replace('$', '').toUpperCase();
  if (!normalized) return false;
  if (pool.denylist.has(normalized)) return false;
  if (pool.mode === 'allowlist') return pool.allowlist.has(normalized);
  if (pool.mode === 'denylist') return !pool.denylist.has(normalized);
  return true;
}

function normalizeUrl(href) {
  if (!href) return '';
  try {
    return new URL(href, 'https://www.binance.com').toString();
  } catch (_) {
    return '';
  }
}

function parseCountToken(token) {
  if (!token) return 0;
  const cleaned = String(token).replace(/,/g, '').trim().toUpperCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 'K') return Math.round(value * 1000);
  if (unit === 'M') return Math.round(value * 1000000);
  if (unit === 'B') return Math.round(value * 1000000000);
  return Math.round(value);
}

function compactNumber(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function looksCryptoRelevant(text) {
  const input = String(text || '');
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(input))) return false;
  return INCLUDE_PATTERNS.some(pattern => pattern.test(input));
}

function hasMarketContext(text) {
  return MARKET_CONTEXT_PATTERNS.some(pattern => pattern.test(String(text || '')));
}

function normalizeSymbols(symbols, pool) {
  return Array.from(new Set((symbols || [])
    .map(symbol => String(symbol || '').replace(/[^A-Z0-9$]/gi, '').toUpperCase())
    .filter(Boolean)
    .filter(symbol => symbol.startsWith('$'))
    .filter(symbol => symbol.length >= 4)
    .filter(symbol => /[A-Z]/.test(symbol))
    .filter(symbol => !/^\$\d+$/.test(symbol))
    .filter(symbol => !BAD_SYMBOLS.has(symbol.replace('$', '')))
    .filter(symbol => isAllowedSymbol(symbol, pool))));
}

function normalizeHashtags(tags) {
  return Array.from(new Set((tags || [])
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
    .filter(tag => tag.length <= 18)
    .filter(tag => !BAD_HASHTAG_PATTERNS.some(pattern => pattern.test(tag)))));
}

function pickDistinct(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.url || item.title || item.excerpt;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateQualityScore(post) {
  let score = post.metrics.total > 0 ? Math.min(40, Math.round(Math.log10(post.metrics.total + 1) * 10)) : 0;
  if (post.symbols.length > 0) score += 20;
  if (post.hashtags.length > 0) score += 10;
  if (/\d/.test(post.rawText)) score += 10;
  if (/\u6b62\u635f|\u538b\u529b|\u652f\u6491|\u76ee\u6807|\u4ed3\u4f4d|\u98ce\u9669|\u7206\u4ed3|\u6760\u6746|\u963b\u529b|\u56de\u8e29|\u7a81\u7834|\u505a\u591a|\u505a\u7a7a/u.test(post.rawText)) score += 15;
  if (post.excerpt.length >= 40 && post.excerpt.length <= 220) score += 10;
  if (/\u4eca\u5929|\u4eca\u665a|\u660e\u5929|\u521a\u521a|\u5c0f\u65f6|\u5206\u949f/u.test(post.rawText)) score += 5;
  if (/\u68ad\u54c8|all in|\u5fc3\u6001\u5d29|\u8d4c/i.test(post.rawText)) score -= 15;
  if (/\u8d5a\u4e00\u8f86|\u79d8\u5bc6|\u6b7b\u90fd\u4e0d\u60f3\u8ba9\u4f60\u77e5\u9053/u.test(post.rawText)) score -= 20;
  return score;
}

function buildInsight(post) {
  const parts = [];
  if (post.symbols.length) parts.push(`coins ${post.symbols.join(', ')}`);
  if (post.hashtags.length) parts.push(`tags ${post.hashtags.join(', ')}`);
  if (post.metrics.total > 0) parts.push(`engagement ${compactNumber(post.metrics.total)}`);
  parts.push(`quality ${post.qualityScore}`);
  return parts.join(' | ');
}

async function collectCards(page, options) {
  await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  for (let i = 0; i < options.scrollRounds; i += 1) {
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(1500);
  }

  return page.evaluate((maxCards) => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/square/post/"]')).slice(0, maxCards * 4);
    return anchors.map((anchor, index) => {
      const container = anchor.closest('article, li, section, div') || anchor.parentElement;
      const text = (container?.innerText || anchor.innerText || '').replace(/\s+/g, ' ').trim();
      const title = (container?.querySelector('h1, h2, h3')?.innerText || anchor.innerText || '').replace(/\s+/g, ' ').trim();
      return { index, href: anchor.getAttribute('href') || '', title, text };
    }).filter(item => item.href && item.text);
  }, options.maxCards);
}

function parseCard(raw, index, pool) {
  const text = String(raw.text || '').replace(/\s+/g, ' ').trim();
  const excerpt = text.slice(0, 220);
  const title = String(raw.title || '').trim() || excerpt.slice(0, 60);
  const countMatches = text.match(/\b\d+(?:\.\d+)?[KMB]?\b/g) || [];
  const counts = countMatches.map(parseCountToken).filter(value => value > 0).sort((a, b) => b - a);
  const rawSymbols = Array.from(new Set(text.match(/\$[A-Z0-9]{2,10}/g) || []));
  const hashtags = normalizeHashtags((text.match(/#[^\s#]{2,24}/g) || []).slice(0, 6));

  const metrics = { topSignals: counts.slice(0, 4), total: counts.slice(0, 4).reduce((sum, value) => sum + value, 0) };
  const post = {
    rank: index + 1,
    title,
    excerpt,
    url: normalizeUrl(raw.href),
    rawText: text,
    symbols: normalizeSymbols(rawSymbols, pool),
    hashtags,
    metrics,
    hotScore: metrics.total + Math.max(0, 100 - index * 3)
  };

  post.qualityScore = calculateQualityScore(post);
  post.finalScore = post.hotScore + post.qualityScore * 100;
  return post;
}

async function main() {
  const config = loadConfig();
  const options = config.square?.hotFeed || {};
  const pool = getSymbolPool(config);

  if (!options.enabled) {
    console.log('Binance Square hot feed is disabled in config.');
    process.exit(0);
  }

  const browser = await chromium.launch({
    headless: options.headless !== false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const contextOptions = {};
  if (options.useSavedLoginState && fs.existsSync(STATE_PATH)) {
    contextOptions.storageState = STATE_PATH;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    console.log(`Opening ${options.url} ...`);
    const rawCards = await collectCards(page, options);
    const posts = pickDistinct(rawCards.map((card, index) => parseCard(card, index, pool)))
      .filter(item => item.url && looksCryptoRelevant(`${item.title} ${item.excerpt} ${item.rawText}`))
      .filter(item => item.symbols.length > 0)
      .filter(item => hasMarketContext(`${item.title} ${item.excerpt} ${item.rawText}`))
      .filter(item => item.qualityScore >= 45)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, options.maxPosts || 8)
      .map((item, index) => ({ ...item, rank: index + 1, insight: buildInsight(item) }));

    if (!posts.length) {
      throw new Error('No crypto-relevant hot posts were detected on the page.');
    }

    writeJson(OUTPUT_PATH, {
      fetchedAt: new Date().toISOString(),
      source: options.url,
      strategy: 'playwright-dom-scan',
      symbolPool: {
        mode: pool.mode,
        allowlist: Array.from(pool.allowlist),
        denylist: Array.from(pool.denylist)
      },
      posts
    });

    console.log(`Saved ${posts.length} hot posts to ${OUTPUT_PATH}`);
    posts.forEach(post => console.log(`${post.rank}. ${post.title} (${compactNumber(post.finalScore)})`));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error('Failed to fetch Binance Square hot posts:', error.message);
  process.exit(1);
});