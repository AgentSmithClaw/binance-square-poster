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
const FEED_API_PATH = '/bapi/composite/v9/friendly/pgc/feed/feed-recommend/list';
const DEFAULT_SYMBOL_ALLOWLIST = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'DOT', 'LTC', 'PEPE', 'TAO', 'FET', 'LINK', 'AVAX', 'SUI', 'TRUMP', 'ENA', 'ZEC', 'RIVER', 'SIREN', 'OP'];
const DEFAULT_IMAGE_LIMIT = 3;
const SAFE_FALLBACK_SYMBOLS = new Set(['BTC','ETH','SOL','BNB','XRP','ADA','DOT','LTC','LINK','AVAX','SUI','OP']);
const DEFAULT_FOCUS_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'LINK', 'AVAX', 'SUI', 'DOT', 'LTC'];

const INCLUDE_PATTERNS = [
  /\$[A-Z0-9]{2,10}/,
  /bitcoin/i,
  /ethereum/i,
  /crypto/i,
  /binance/i,
  /btc/i,
  /eth/i,
  /sol/i,
  /xrp/i,
  /doge/i,
  /trade/i,
  /market/i,
  /liquidation/i,
  /breakout/i,
  /support/i,
  /resistance/i,
  /long/i,
  /short/i,
  /volume/i,
  /entry/i,
  /target/i,
  /setup/i,
  /chart/i,
  /position/i
];

const EXCLUDE_PATTERNS = [
  /hormuz/i,
  /saudi/i,
  /iran/i,
  /oil prices?/i,
  /crude oil/i,
  /geopolit/i,
  /missile/i,
  /bill gates/i,
  /jeff bezos/i,
  /elon musk/i,
  /forbes/i,
  /richest person/i,
  /microsoft titan/i,
  /amazon/i,
  /spacex/i,
  /service members?/i,
  /tanker crashed/i,
  /wife and their three children/i
];

const MARKET_CONTEXT_PATTERNS = [
  /price/i,
  /market/i,
  /breakout/i,
  /support/i,
  /resistance/i,
  /long/i,
  /short/i,
  /liquidation/i,
  /volume/i,
  /profit/i,
  /trade/i,
  /entry/i,
  /target/i,
  /holders?/i,
  /supply/i,
  /pump/i,
  /dump/i,
  /whales?/i,
  /fomo/i,
  /position/i,
  /stop loss/i,
  /take profit/i,
  /tp\d/i,
  /sl[: ]/i,
  /risk\/reward/i,
  /reload zone/i,
  /trade plan/i,
  /chart/i,
  /setup/i,
  /invalidation/i,
  /close above/i,
  /close below/i
];

const TRADING_SIGNAL_PATTERNS = [
  /entry[: ]/i,
  /target[s]?[: ]/i,
  /tp\d/i,
  /sl[: ]/i,
  /stop loss/i,
  /take profit/i,
  /support/i,
  /resistance/i,
  /trade plan/i,
  /reload zone/i,
  /risk\/reward/i,
  /position/i,
  /short/i,
  /long/i,
  /breakout/i,
  /retest/i,
  /bounce/i,
  /1h candle/i,
  /4h chart/i,
  /daily chart/i,
  /chart/i,
  /setup/i,
  /invalidation/i,
  /close above/i,
  /close below/i
];

const HYPE_PATTERNS = [
  /to the moon/i,
  /generational wealth/i,
  /do not miss out/i,
  /guaranteed profit/i,
  /1000x/i,
  /100x/i,
  /lambo/i,
  /lamborghini/i,
  /party/i,
  /gift/i,
  /bonus/i,
  /massive projections/i,
  /parabolic/i,
  /print money/i,
  /millionaire/i,
  /changed my life/i,
  /big win/i,
  /big profit/i,
  /i just bought/i,
  /my cousin bought/i,
  /next 100x wave/i,
  /trust me/i,
  /best profit giving/i,
  /booooooooo/i,
  /mooning harder/i
];

const SPAM_PATTERNS = [
  /referral/i,
  /get bonus/i,
  /sign up/i,
  /invite code/i,
  /promo code/i,
  /link in bio/i,
  /copy trade/i,
  /follow me/i,
  /dm me/i,
  /join my/i,
  /airdrop link/i,
  /register now/i,
  /pinned post/i,
  /check my profile/i,
  /click here to trade/i,
  /click here/i,
  /shared a gift/i,
  /shared a \$5/i,
  /captions for/i,
  /better, more powerful caption/i,
  /write2earn/i
];

const HARD_FILTER_PATTERNS = [
  /my cousin bought/i,
  /friend bought/i,
  /i just bought/i,
  /changed my life/i,
  /i earn a big profit/i,
  /make around \$?\d[\d,]*/i,
  /waiting for .* moon/i,
  /better, more powerful caption/i,
  /captions for/i,
  /10x.?20x/i,
  /next crypto surge/i,
  /next 100x wave/i,
  /shared a gift/i,
  /shared a \$5/i,
  /thank you all/i,
  /trust me/i,
  /best profit giving/i,
  /booooooooo/i,
  /mooning harder/i,
  /service members?/i,
  /generational wealth/i,
  /millionaire play/i,
  /my life savings/i,
  /should i hold/i,
  /speaking at .* summit/i,
  /hosted by/i,
  /washington dc/i,
  /you can buy/i,
  /then \$\d/i,
  /hype soon/i
];

const BAD_SYMBOLS = new Set(['FUTURE', 'BTCUSDT', 'ETHUSDT', 'USDT', 'USD', 'QC', 'FLOWUSDT', 'WEB3', '1000X']);
const BAD_HASHTAG_PATTERNS = [/useaiforcryptotrading/i, /oil/i, /saudi/i, /iran/i, /write2earn/i];
const ENTRY_PATTERNS = [
  /entry(?: zone| point| price| prices)?[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i,
  /(?:long|short)(?:ing)?[^\d$]{0,25}(?:at|from|near)\s*\$?\d[\d.,]*(?:k|m|b|%|x)?/i,
  /buy(?: zone|ing)?[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i,
  /sell(?: zone|ing)?[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i,
  /reload zone[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i
];
const RISK_PATTERNS = [
  /(?:stop loss|stop-loss|sl|invalidation)[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i,
  /close (?:above|below)[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i,
  /risk[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i
];
const TARGET_PATTERNS = [
  /target(?:s)?[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i,
  /tp\d?[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i,
  /take profit[^\d$]{0,25}\$?\d[\d.,]*(?:k|m|b|%|x)?/i
];
const ANALYSIS_PATTERNS = [
  /chart/i,
  /liquidity/i,
  /heat map/i,
  /support/i,
  /resistance/i,
  /invalidation/i,
  /close above/i,
  /close below/i,
  /retest/i,
  /range/i,
  /breakout/i,
  /bounce/i,
  /liquidation/i,
  /scenario/i,
  /risk/i,
  /stop loss/i,
  /target/i,
  /entry/i,
  /setup/i,
  /trade plan/i
];
const NOISE_PATTERNS = [
  /friend bought/i,
  /millionaire play/i,
  /generational wealth/i,
  /my life savings/i,
  /should i hold/i,
  /speaking at .* summit/i,
  /hosted by/i,
  /looking forward to engaging/i,
  /washington dc/i,
  /march \d{1,2}/i,
  /you can buy/i,
  /then \$\d/i,
  /hype soon/i,
  /bull run outlook/i,
  /are you sleeping/i,
  /get left behind/i
];

function getFocusSymbols(config) {
  const configured = (config.square?.hotFeed?.preferredSymbols || [])
    .map(item => String(item).toUpperCase())
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_FOCUS_SYMBOLS);
}

function hasFocusSymbol(post, focusSymbols) {
  return (post.symbols || []).some(symbol => focusSymbols.has(String(symbol).replace('$', '').toUpperCase()));
}

function getSymbolPool(config) {
  const mode = config.square?.symbolPool?.mode || 'allowlist';
  const configuredAllowlist = (config.square?.symbolPool?.allowlist || []).map(item => String(item).toUpperCase());
  const allowlist = new Set(configuredAllowlist.length ? configuredAllowlist : DEFAULT_SYMBOL_ALLOWLIST);
  const denylist = new Set((config.square?.symbolPool?.denylist || []).map(item => String(item).toUpperCase()));
  return { mode, allowlist, denylist };
}

function isAllowedSymbol(symbol, pool) {
  const normalized = String(symbol || '').replace('$', '').toUpperCase();
  if (!normalized) return false;
  if (pool.denylist.has(normalized)) return false;
  if (pool.mode === 'allowlist') return pool.allowlist.size === 0 || pool.allowlist.has(normalized);
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

function compactNumber(value) {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function cleanText(value) {
  return String(value || '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[{}\[\]]/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    .map(symbol => symbol.startsWith('$') ? symbol : `$${symbol}`)
    .filter(symbol => symbol.length >= 4)
    .filter(symbol => /[A-Z]/.test(symbol))
    .filter(symbol => !/^\$\d+$/.test(symbol))
    .filter(symbol => !/^\$\d+(?:\.\d+)?[KMB]?$/.test(symbol))
    .filter(symbol => !/^\$\d+[A-Z]$/.test(symbol))
    .filter(symbol => !BAD_SYMBOLS.has(symbol.replace('$', '')))
    .filter(symbol => isAllowedSymbol(symbol, pool))));
}

function normalizeHashtags(tags) {
  return Array.from(new Set((tags || [])
    .map(tag => String(tag || '').trim())
    .filter(Boolean)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
    .filter(tag => tag.length <= 24)
    .filter(tag => !BAD_HASHTAG_PATTERNS.some(pattern => pattern.test(tag)))));
}

function pickDistinct(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.postId || item.url || item.title || item.excerpt;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function patternScore(patterns, text) {
  const input = String(text || '');
  return patterns.reduce((sum, pattern) => sum + (pattern.test(input) ? 1 : 0), 0);
}

function isLikelySpam(text) {
  return patternScore(SPAM_PATTERNS, text) > 0;
}

function isLikelyMacroNoise(text, hashtags = []) {
  const input = String(text || '');
  const joinedTags = hashtags.join(' ');
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(input) || pattern.test(joinedTags));
}

function hasTooManyOffTopicHashtags(post) {
  return post.hashtags.length >= 3 && post.hashtags.filter(tag => BAD_HASHTAG_PATTERNS.some(pattern => pattern.test(tag))).length >= 1;
}

function countMojibake() {
  return 0;
}

function hasBrokenEncoding(text) {
  const input = String(text || '');
  return input.includes('\uFFFD') || /\bundefined\b/i.test(input);
}

function shouldHardFilter(post) {
  return HARD_FILTER_PATTERNS.some(pattern => pattern.test(post.rawText));
}

function analysisIntentScore(text) {
  return patternScore(ANALYSIS_PATTERNS, text);
}

function isLikelyNoisePost(text) {
  const input = String(text || '').toLowerCase();
  const extraTerms = [
    'holding this',
    'are you hold',
    'yo fam',
    'check out my crypto stash',
    'dream targets',
    'ride this rocket',
    'three gems',
    'buy and hold',
    '30x this year',
    'regret selling',
    'which coin you would like to buy',
    'hey friends if i send you',
    'easily reach',
    'possible $',
    "don't miss",
    'dont miss',
    "don't ignore",
    'will hit $',
    'will reach $',
    'will make',
    'next target $',
    'hello friends',
    'coming soon',
    'big breakout coming soon'
  ];
  return patternScore(NOISE_PATTERNS, text) > 0 || extraTerms.some(term => input.includes(term));
}

function hasEntrySignal(text) {
  return ENTRY_PATTERNS.some(pattern => pattern.test(text));
}

function hasRiskSignal(text) {
  return RISK_PATTERNS.some(pattern => pattern.test(text));
}

function hasTargetSignal(text) {
  return TARGET_PATTERNS.some(pattern => pattern.test(text));
}

function calculateTradingSignalScore(post) {
  let score = patternScore(TRADING_SIGNAL_PATTERNS, post.rawText) * 6;
  if (post.hasEntrySignal) score += 24;
  if (post.hasRiskSignal) score += 18;
  if (post.hasTargetSignal) score += 18;
  if (post.hasCompleteTradeSetup) score += 42;
  if (/support|resistance|risk\/reward|reload zone/i.test(post.rawText)) score += 10;
  if (/short|long/i.test(post.rawText) && /\$[A-Z0-9]{2,10}/.test(post.rawText)) score += 8;
  return score;
}

function calculateHypePenalty(post) {
  let penalty = patternScore(HYPE_PATTERNS, post.rawText) * 12;
  if (/50,000\$|50000\$|50 000\$|\$69 Million|\$7 Million|\$17,010/i.test(post.rawText)) penalty += 18;
  if (/to the moon|do not miss out|generational wealth|gift|thanks to|my cousin bought|i just bought/i.test(post.rawText)) penalty += 24;
  if (!post.hasCompleteTradeSetup && /trust me|moon|100x|10x|profit giving|pump/i.test(post.rawText)) penalty += 18;
  return penalty;
}

function calculateQualityScore(post) {
  let score = post.metrics.total > 0 ? Math.min(40, Math.round(Math.log10(post.metrics.total + 1) * 10)) : 0;
  if (post.symbols.length > 0) score += 20;
  if (post.hashtags.length > 0) score += 8;
  if (/\d/.test(post.rawText)) score += 10;
  if (post.excerpt.length >= 20 && post.excerpt.length <= 260) score += 10;
  if (hasMarketContext(post.rawText)) score += 15;
  if (post.hasCompleteTradeSetup) score += 30;
  if (post.hasEntrySignal && post.hasRiskSignal) score += 12;
  if (post.analysisIntentScore >= 2) score += 12;
  if (post.hasTargetSignal && !post.hasEntrySignal && !post.hasRiskSignal) score -= 25;
  if (/today|now|breaking|currently/i.test(post.rawText)) score += 5;
  if (isLikelySpam(post.rawText)) score -= 40;
  if (isLikelyMacroNoise(post.rawText, post.hashtags)) score -= 45;
  if (hasBrokenEncoding(post.rawText)) score -= 35;
  score -= calculateHypePenalty(post);
  score += calculateTradingSignalScore(post);
  return score;
}

function buildInsight(post) {
  const parts = [];
  if (post.symbols.length) parts.push(`coins ${post.symbols.join(', ')}`);
  if (post.hashtags.length) parts.push(`tags ${post.hashtags.join(', ')}`);
  if (post.metrics.total > 0) parts.push(`engagement ${compactNumber(post.metrics.total)}`);
  if (post.hasCompleteTradeSetup) parts.push('complete setup');
  parts.push(`signal ${post.tradingSignalScore}`);
  parts.push(`quality ${post.qualityScore}`);
  return parts.join(' | ');
}

function toIsoFromUnixSeconds(seconds) {
  if (!Number.isFinite(Number(seconds))) return null;
  return new Date(Number(seconds) * 1000).toISOString();
}

function extractSymbolsFromFeedItem(item, pool) {
  const contentText = cleanText(item.content);
  const contentMatches = Array.from(new Set(contentText.match(/\$[A-Z0-9]{2,10}/g) || []));
  const pairSymbols = (item.tradingPairsV2 || [])
    .map(pair => String(pair?.code || '').toUpperCase())
    .filter(Boolean)
    .filter(code => contentText.toUpperCase().includes(`$${code}`) || contentText.toUpperCase().includes(code));

  const combined = contentMatches.length
    ? [...contentMatches, ...pairSymbols]
    : pairSymbols.slice(0, 1);

  return normalizeSymbols(combined, pool);
}

function extractTagsFromFeedItem(item) {
  const tags = (item.hashtagList || []).map(tag => tag?.tagName || tag?.name || tag?.title).filter(Boolean);
  const contentTags = cleanText(item.content).match(/#[^\s#]{2,24}/g) || [];
  return normalizeHashtags([...tags, ...contentTags].slice(0, 8));
}

function collectTopics(item, post) {
  const topics = [];
  for (const symbol of post.symbols) topics.push(symbol);
  for (const tag of post.hashtags) topics.push(tag);
  for (const pair of item.tradingPairsV2 || []) {
    if (pair?.chainName) topics.push(pair.chainName);
  }
  return Array.from(new Set(topics)).slice(0, 10);
}

function extractImageUrls(item) {
  const values = [];
  if (Array.isArray(item.images)) {
    for (const image of item.images) {
      if (typeof image === 'string') values.push(image);
      else if (image && typeof image === 'object') {
        for (const key of ['url', 'imageUrl', 'src', 'originUrl']) {
          if (image[key]) values.push(image[key]);
        }
      }
    }
  }
  if (Array.isArray(item.imageMetaList)) {
    for (const image of item.imageMetaList) {
      for (const key of ['url', 'originUrl', 'downloadUrl']) {
        if (image?.[key]) values.push(image[key]);
      }
    }
  }
  for (const key of ['coverMeta']) {
    const image = item[key];
    if (image && typeof image === 'object') {
      for (const inner of ['url', 'originUrl', 'downloadUrl']) {
        if (image[inner]) values.push(image[inner]);
      }
    }
  }
  return Array.from(new Set(values.map(normalizeUrl).filter(Boolean)));
}

function extractAssetCandidates(item, post, imageLimit) {
  const candidates = [];
  const imageUrls = extractImageUrls(item).slice(0, imageLimit);
  imageUrls.forEach((url, index) => {
    candidates.push({
      type: 'post-image',
      url,
      rank: index + 1,
      score: 100 - index * 5,
      symbol: post.symbols[0] || null,
      sourcePostId: post.postId,
      sourcePage: post.postUrl
    });
  });

  const allowedSymbols = new Set((post.symbols || []).map(symbol => String(symbol).replace('$', '').toUpperCase()));
  (item.tradingPairsV2 || [])
    .filter(pair => {
      const code = String(pair?.code || '').toUpperCase();
      if (!code) return false;
      if (!allowedSymbols.size) return true;
      return allowedSymbols.has(code);
    })
    .slice(0, imageLimit)
    .forEach((pair, index) => {
      if (pair?.logoUrl) {
        candidates.push({
          type: 'symbol-logo',
          url: normalizeUrl(pair.logoUrl),
          rank: candidates.length + 1,
          score: 70 - index * 3,
          symbol: pair.code ? `$${String(pair.code).toUpperCase()}` : null,
          sourcePostId: post.postId,
          sourcePage: post.postUrl
        });
      }
      if (pair?.chainLogo) {
        candidates.push({
          type: 'chain-logo',
          url: normalizeUrl(pair.chainLogo),
          rank: candidates.length + 1,
          score: 55 - index * 3,
          symbol: pair.code ? `$${String(pair.code).toUpperCase()}` : null,
          sourcePostId: post.postId,
          sourcePage: post.postUrl
        });
      }
    });

  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate.url || seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    unique.push(candidate);
  }
  return unique.slice(0, Math.max(imageLimit, DEFAULT_IMAGE_LIMIT));
}

function parseFeedItem(item, index, pool, sourcePage, fetchedAt, imageLimit) {
  const contentText = cleanText(item.content);
  const title = cleanText(item.title) || contentText.slice(0, 80);
  const excerpt = contentText.slice(0, 220);
  const symbols = extractSymbolsFromFeedItem(item, pool);
  const hashtags = extractTagsFromFeedItem(item);
  const metrics = {
    likeCount: Number(item.likeCount || 0),
    commentCount: Number(item.commentCount || item.replyCount || 0),
    shareCount: Number(item.shareCount || 0),
    repostCount: Number(item.shareCount || item.quoteCount || 0),
    viewCount: Number(item.viewCount || 0)
  };
  metrics.total = metrics.likeCount + metrics.commentCount + metrics.shareCount + metrics.viewCount;
  metrics.topSignals = [metrics.viewCount, metrics.likeCount, metrics.commentCount, metrics.shareCount].filter(Boolean);

  const rawText = cleanText(`${title} ${contentText}`);
  const post = {
    rank: index + 1,
    postId: String(item.id || ''),
    authorName: cleanText(item.authorName || item.username || ''),
    authorId: item.squareAuthorId || '',
    authorHandle: cleanText(item.username || ''),
    publishTime: toIsoFromUnixSeconds(item.date),
    title,
    excerpt,
    contentText,
    rawText,
    likeCount: metrics.likeCount,
    commentCount: metrics.commentCount,
    shareCount: metrics.shareCount,
    repostCount: metrics.repostCount,
    viewCount: metrics.viewCount,
    postUrl: normalizeUrl(item.webLink),
    url: normalizeUrl(item.webLink),
    topic: '',
    tag: hashtags[0] || '',
    topics: [],
    hashtags,
    symbols,
    sourcePage,
    fetchedAt,
    metrics,
    cardType: item.cardType || '',
    contentType: item.contentType || null,
    imageCount: extractImageUrls(item).length,
    imageUrls: extractImageUrls(item),
    relatedImageCandidates: [],
    isSpam: false,
    isMacroNoise: false,
    hasBrokenEncoding: false,
    hasEntrySignal: false,
    hasRiskSignal: false,
    hasTargetSignal: false,
    hasCompleteTradeSetup: false,
    tradingSignalScore: 0,
    hypePenalty: 0
  };

  post.topics = collectTopics(item, post);
  post.topic = post.topics[0] || post.symbols[0] || post.hashtags[0] || '';
  post.isSpam = isLikelySpam(post.rawText);
  post.isMacroNoise = isLikelyMacroNoise(post.rawText, post.hashtags);
  post.hasBrokenEncoding = hasBrokenEncoding(post.rawText);
  post.hasEntrySignal = hasEntrySignal(post.rawText);
  post.hasRiskSignal = hasRiskSignal(post.rawText);
  post.hasTargetSignal = hasTargetSignal(post.rawText);
  post.hasCompleteTradeSetup = post.hasEntrySignal && post.hasRiskSignal && post.hasTargetSignal;
  post.relatedImageCandidates = extractAssetCandidates(item, post, imageLimit);
  post.tradingSignalScore = calculateTradingSignalScore(post);
  post.hypePenalty = calculateHypePenalty(post);
  post.hotScore = metrics.total + Math.max(0, 120 - index * 5);
  post.qualityScore = calculateQualityScore(post);
  post.finalScore = post.hotScore + post.qualityScore * 100 + post.tradingSignalScore * 320 - post.hypePenalty * 220;
  post.insight = buildInsight(post);
  return post;
}

async function collectApiFeed(page, feedPageUrl, pageSize, pagesToScan) {
  const responsePromise = page.waitForResponse(response => (
    response.url().includes(FEED_API_PATH) && response.request().method() === 'POST' && response.status() === 200
  ), { timeout: 45000 });

  await page.goto(feedPageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const response = await responsePromise;
  const json = await response.json().catch(() => null);
  const firstItems = Array.isArray(json?.data?.vos) ? json.data.vos : [];

  if (!firstItems.length) {
    throw new Error(`Feed API returned no posts (status ${response.status()}).`);
  }

  let request = null;
  try {
    request = JSON.parse(response.request().postData() || 'null');
  } catch (_) {
    request = response.request().postData() || null;
  }

  if (request && pageSize && !request.pageSize) {
    request.pageSize = pageSize;
  }

  const combined = [...firstItems];
  const totalPages = Math.max(1, Number(pagesToScan || 1));

  for (let pageIndex = 2; pageIndex <= totalPages; pageIndex += 1) {
    const nextRequest = {
      ...(request && typeof request === 'object' ? request : {}),
      pageIndex,
      pageSize: Number(pageSize || request?.pageSize || 20)
    };

    const extra = await page.evaluate(async ({ apiPath, body }) => {
      const response = await fetch(apiPath, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        return [];
      }
      const json = await response.json().catch(() => null);
      return Array.isArray(json?.data?.vos) ? json.data.vos : [];
    }, { apiPath: FEED_API_PATH, body: nextRequest }).catch(() => []);

    if (!Array.isArray(extra) || !extra.length) {
      break;
    }

    combined.push(...extra);
  }

  return { strategy: 'playwright-feed-api', request, items: combined };
}

async function collectCardsFromDom(page, options) {
  await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  for (let i = 0; i < (options.scrollRounds || 3); i += 1) {
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(1500);
  }

  const items = await page.evaluate((maxCards) => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/square/post/"]')).slice(0, maxCards * 4);
    return anchors.map((anchor, index) => {
      const container = anchor.closest('article, li, section, div') || anchor.parentElement;
      const text = (container?.innerText || anchor.innerText || '').replace(/\s+/g, ' ').trim();
      const title = (container?.querySelector('h1, h2, h3')?.innerText || anchor.innerText || '').replace(/\s+/g, ' ').trim();
      const images = Array.from(container?.querySelectorAll('img') || [])
        .map(img => img.getAttribute('src'))
        .filter(Boolean)
        .slice(0, 3);
      return {
        id: anchor.getAttribute('href') || `dom-${index}`,
        webLink: anchor.getAttribute('href') || '',
        title,
        content: text,
        authorName: '',
        squareAuthorId: '',
        username: '',
        date: Math.floor(Date.now() / 1000),
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        viewCount: 0,
        tradingPairsV2: [],
        hashtagList: [],
        images
      };
    }).filter(item => item.webLink && item.content);
  }, options.maxCards || 20);

  return { strategy: 'playwright-dom-fallback', request: null, items };
}

function buildTopImageCandidates(posts, imageLimit) {
  const merged = [];
  const seen = new Set();
  for (const post of posts) {
    for (const candidate of post.relatedImageCandidates || []) {
      const key = candidate.url;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push({
        ...candidate,
        title: post.title,
        authorName: post.authorName,
        postId: post.postId,
        postUrl: post.postUrl,
        finalScore: post.finalScore,
        tradingSignalScore: post.tradingSignalScore,
        hasCompleteTradeSetup: post.hasCompleteTradeSetup
      });
    }
  }

  return merged
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, Math.max(imageLimit, DEFAULT_IMAGE_LIMIT));
}

function filterPosts(posts, options, focusSymbols) {
  const minimumQuality = Number(options.minimumQualityScore || 25);
  const maxPosts = Number(options.maxPosts || 8);
  const minViewCount = Number(options.minimumViewCount || 200);

  const common = pickDistinct(posts)
    .filter(item => item.postUrl)
    .filter(item => item.viewCount >= minViewCount || item.likeCount >= 10 || item.commentCount >= 5)
    .filter(item => looksCryptoRelevant(`${item.title} ${item.contentText} ${item.rawText}`))
    .filter(item => item.symbols.length > 0)
    .filter(item => !item.isSpam)
    .filter(item => !item.isMacroNoise)
    .filter(item => !item.hasBrokenEncoding)
    .filter(item => !item.isLikelyNoisePost)
    .filter(item => !hasTooManyOffTopicHashtags(item))
    .filter(item => !shouldHardFilter(item))
    .filter(item => item.finalScore > 0)
    .filter(item => item.qualityScore >= minimumQuality);

  const base = common
    .filter(item => item.hasCompleteTradeSetup || item.analysisIntentScore >= 2 || item.tradingSignalScore >= 18)
    .filter(item => hasMarketContext(`${item.title} ${item.contentText} ${item.rawText}`) || item.tradingSignalScore >= 18 || item.analysisIntentScore >= 2);

  const relaxedBase = common
    .filter(item => hasMarketContext(`${item.title} ${item.contentText} ${item.rawText}`) || item.analysisIntentScore >= 1 || item.tradingSignalScore >= 8);

  const sortByPriority = (a, b) => {
    if (b.hasCompleteTradeSetup !== a.hasCompleteTradeSetup) return Number(b.hasCompleteTradeSetup) - Number(a.hasCompleteTradeSetup);
    if ((b.tradingSignalScore || 0) !== (a.tradingSignalScore || 0)) return b.tradingSignalScore - a.tradingSignalScore;
    return b.finalScore - a.finalScore;
  };

  const completeSetups = base.filter(item => item.hasCompleteTradeSetup).sort(sortByPriority);
  const structuredFallback = base.filter(item => !item.hasCompleteTradeSetup && (item.hasEntrySignal || item.hasTargetSignal || item.hasRiskSignal)).sort(sortByPriority);
  const qualityFallback = base.filter(item => !item.hasCompleteTradeSetup && !item.hasEntrySignal && !item.hasTargetSignal && !item.hasRiskSignal).sort(sortByPriority);

  return [...completeSetups, ...structuredFallback, ...qualityFallback]
    .slice(0, maxPosts)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

async function main() {
  const config = loadConfig();
  const options = config.square?.hotFeed || {};
  const pool = getSymbolPool(config);
  const focusSymbols = getFocusSymbols(config);
  const imageLimit = Number(config.square?.images?.perPostLimit || options.imageLimit || DEFAULT_IMAGE_LIMIT);

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
  const fetchedAt = new Date().toISOString();
  const feedPageUrl = options.apiPageUrl || String(options.url || '').replace('/zh-CN/', '/en/');

  try {
    console.log(`Opening ${options.url} ...`);

    let feedResult;
    try {
      feedResult = await collectApiFeed(page, feedPageUrl, options.pageSize, options.pagesToScan || 3);
    } catch (apiError) {
      console.warn(`Feed API fetch failed, falling back to DOM scan: ${apiError.message}`);
      feedResult = await collectCardsFromDom(page, options);
    }

    const parsedPosts = feedResult.items.map((item, index) => parseFeedItem(item, index, pool, feedPageUrl, fetchedAt, imageLimit));
    const posts = filterPosts(parsedPosts, options, focusSymbols);

    if (!posts.length) {
      throw new Error('No crypto-relevant hot posts were detected from the available Binance Square data sources.');
    }

    writeJson(OUTPUT_PATH, {
      fetchedAt,
      source: options.url,
      sourcePage: options.url,
      feedPage: feedPageUrl,
      strategy: feedResult.strategy,
      request: feedResult.request,
      symbolPool: {
        mode: pool.mode,
        allowlist: Array.from(pool.allowlist),
        denylist: Array.from(pool.denylist)
      },
      imageCandidates: buildTopImageCandidates(posts, imageLimit),
      posts
    });

    console.log(`Saved ${posts.length} hot posts to ${OUTPUT_PATH}`);
    posts.forEach(post => {
      const setupLabel = post.hasCompleteTradeSetup ? 'complete-setup' : 'partial-setup';
      console.log(`${post.rank}. ${post.authorName || 'Unknown'} | ${(post.title || post.contentText).slice(0, 60)} (${compactNumber(post.finalScore)}) [${setupLabel}]`);
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error('Failed to fetch Binance Square hot posts:', error.message);
  process.exit(1);
});
