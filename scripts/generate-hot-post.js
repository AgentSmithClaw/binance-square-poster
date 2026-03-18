#!/usr/bin/env node

const path = require('path');
const stateManager = require('./state-manager');
const { DATA_DIR, readJsonIfExists, writeJson, loadConfig } = require('./config-utils');

const HOT_POSTS_PATH = path.join(DATA_DIR, 'hot-posts.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'generated-hot-post.json');
const DEFAULT_GROUP_ID = 'oc_f0540e704bf850b75fb04c3ecbe4adea';

const STOP_WORDS = new Set([
  'THE', 'THIS', 'THAT', 'WITH', 'FROM', 'YOUR', 'WILL', 'ABOUT', 'AFTER', 'TODAY',
  'MARKET', 'SQUARE', 'BINANCE', 'POST', 'POSTS', 'THREAD', 'THREADS', 'CRYPTO',
  'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'HOW', 'WHY', 'WHAT', 'WHEN',
  'FUTURE', 'BTCUSDT', 'ETHUSDT', 'USDT', 'USD', 'GUYS', 'LOOK', 'THANKS',
  'PRICE', 'PREDICTIONS', 'INSANE', 'BREAKING', 'FINALLY', 'GOOD', 'READY',
  'OUT', 'MOON', 'FRIEND', 'COUSIN', 'BOUGHT', 'YEARS', 'AGO'
]);

const DEFAULT_SYMBOLS = ['$BTC', '$ETH', '$SOL'];
const DEFAULT_TAGS = ['#BTC', '#ETH', '#MarketWatch'];
const DEFAULT_KEYWORDS = ['momentum', 'risk', 'breakout'];
const STYLE_LIBRARY = ['steady', 'aggressive', 'debate', 'educational'];
const KEYWORD_PATTERNS = [
  /breakout/i,
  /support/i,
  /resistance/i,
  /liquidation/i,
  /volume/i,
  /entry/i,
  /target/i,
  /short/i,
  /long/i,
  /whale/i,
  /holders?/i,
  /supply/i,
  /momentum/i,
  /pump/i,
  /dump/i,
  /trend/i,
  /flow/i,
  /rotation/i,
  /bounce/i,
  /reclaim/i,
  /bull/i,
  /bear/i,
  /risk/i,
  /setup/i,
  /chart/i
];

function toLocalTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    hour12: false,
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date).replace(',', '');
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isUsefulKeyword(word, posts) {
  if (!word || STOP_WORDS.has(word)) return false;
  if (word.length < 4) return false;
  if (/^\d/.test(word)) return false;
  if (!/[A-Z]/.test(word)) return false;

  const mentions = posts.filter(post => cleanText(`${post.title || ''} ${post.excerpt || ''}`).toUpperCase().includes(word)).length;
  return mentions >= 2 || KEYWORD_PATTERNS.some(pattern => pattern.test(word));
}

function frequencyMap(posts) {
  const score = new Map();

  for (const post of posts) {
    const weight = post.finalScore || post.hotScore || 0;

    for (const symbol of post.symbols || []) {
      score.set(symbol, (score.get(symbol) || 0) + weight);
    }

    for (const tag of post.hashtags || []) {
      score.set(tag, (score.get(tag) || 0) + weight);
    }

    const words = cleanText(post.title || post.excerpt || '')
      .toUpperCase()
      .match(/[A-Z]{3,}/g) || [];

    for (const word of words) {
      if (!isUsefulKeyword(word, posts)) continue;
      score.set(word, (score.get(word) || 0) + Math.max(20, Math.round(weight / 50)));
    }
  }

  return Array.from(score.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token, score]) => ({ token, score }));
}

function extractCleanKeywords(ranked) {
  return Array.from(new Set(
    ranked
      .map(item => String(item.token || '').trim())
      .filter(token => !token.startsWith('$'))
      .filter(token => !token.startsWith('#'))
      .filter(token => !STOP_WORDS.has(token.toUpperCase()))
      .filter(token => token.length >= 4)
      .map(token => token.toUpperCase())
  )).slice(0, 5);
}

function summarizePosts(posts) {
  return posts.slice(0, 3).map((post, index) => {
    const hook = post.symbols[0] || post.hashtags[0] || 'hot topic';
    const line = cleanText(post.excerpt || post.title || '');
    return `${index + 1}. ${hook}: ${line.slice(0, 56)}`;
  });
}

function makeContext(posts) {
  const ranked = frequencyMap(posts);
  const topSymbols = Array.from(new Set(ranked.filter(item => item.token.startsWith('$')).map(item => item.token))).slice(0, 5);
  const topTags = Array.from(new Set(ranked.filter(item => item.token.startsWith('#')).map(item => item.token))).slice(0, 5);
  const keywords = extractCleanKeywords(ranked);

  return {
    topSymbols: topSymbols.length ? topSymbols : DEFAULT_SYMBOLS,
    topTags: topTags.length ? topTags : DEFAULT_TAGS,
    keywords: keywords.length ? keywords : DEFAULT_KEYWORDS,
    summaries: summarizePosts(posts),
    primarySymbol: (topSymbols[0] || DEFAULT_SYMBOLS[0]).replace('$', ''),
    secondarySymbol: (topSymbols[1] || DEFAULT_SYMBOLS[1]).replace('$', ''),
    timestamp: toLocalTimestamp(),
    topPosts: posts.slice(0, 3)
  };
}

function detectMarketAngle(posts) {
  const joined = posts.map(post => `${post.title} ${post.rawText}`).join(' ');

  if (/liquidation|short|long|contract|leverage/i.test(joined)) return 'Contract sentiment and short-term positioning are heating up.';
  if (/breakout|reclaim|new high|bull/i.test(joined)) return 'The feed is leaning toward breakout continuation rather than mean reversion.';
  if (/support|bounce|range|pullback/i.test(joined)) return 'The market still looks range-bound and reactive around key levels.';
  return 'Attention is rotating quickly across a handful of liquid symbols.';
}

function detectRiskLine(posts) {
  const joined = posts.map(post => `${post.title} ${post.rawText}`).join(' ');

  if (/liquidation|leverage|contract/i.test(joined)) return 'The biggest risk here is not missing the move, but getting trapped with leverage when the market snaps back.';
  if (/breakout|reclaim/i.test(joined)) return 'A breakout matters less than whether price can hold the level after the first push.';
  return 'When heat builds fast, define the invalidation before thinking about size.';
}

function buildPrimaryPost(context) {
  const [s1, s2, s3] = context.topSymbols;
  const angle = detectMarketAngle(context.topPosts);
  const riskLine = detectRiskLine(context.topPosts);
  const title = `Binance Square Hot Feed | ${context.timestamp}`;
  const body = [
    title,
    '',
    'Quick read after scanning the latest Square hot posts:',
    angle,
    '',
    `The symbols showing up most often are ${s1}, ${s2 || s1}, and ${s3 || s2 || s1}.`,
    `The recurring signals are ${context.keywords.join(', ')}.`,
    '',
    'Top notes from the feed:',
    ...context.summaries,
    '',
    'My take:',
    `${s1} is still the strongest attention center, but the real question is whether that heat spills into the second tier or dies at the headline level.`,
    riskLine,
    'If you want engagement, the safest structure is still: clear view + condition + risk reminder.',
    '',
    'Which symbol are you watching most closely right now?'
  ].join('\n');

  return { title, content: body };
}

function buildViralTemplates(context) {
  const [s1, s2, s3] = context.topSymbols;
  const [k1, k2, k3] = context.keywords.length ? context.keywords : DEFAULT_KEYWORDS;
  const tag = context.topTags[0] || '#MarketWatch';

  return [
    {
      templateId: 'contrarian-alert',
      name: 'Contrarian Alert',
      structure: ['open with a counter-view', 'compare with crowd narrative', 'set the trigger', 'add risk', 'end with a question'],
      content: [
        `Most people are staring at ${s1}, but the more interesting setup may be ${s2 || s1}.`,
        `${s1} already has the attention. That does not automatically make it the best risk-reward trade from here.`,
        `The part I care about most is whether ${k1} and ${k2 || k1} strengthen together.`,
        `If ${s1} holds and ${s2 || s1} starts expanding in volume, the move can spread. If not, chasing becomes expensive fast.`,
        `Which one has more upside from here: ${s1} or ${s2 || s1}? ${tag}`
      ].join('\n')
    },
    {
      templateId: 'checklist-breakdown',
      name: 'Checklist Breakdown',
      structure: ['one-line thesis', 'three checks', 'execution note', 'close with interaction'],
      content: [
        `Today's strongest discussion thread still runs through ${s1}.`,
        '',
        'Three things I would check first:',
        `1. Is ${s1} still absorbing attention, or is it rotating into ${s2 || s1}?`,
        `2. Are ${k1} and ${k2 || k1} showing up as actual trading signals instead of hype phrases?`,
        `3. Are risk warnings increasing at the same time as bullish calls?`,
        '',
        'If all three line up, it is a tradable theme. If not, it is probably just another emotional spike.',
        `Where is your focus today: ${s1}, ${s3 || s2 || s1}, or neither?`
      ].join('\n')
    },
    {
      templateId: 'momentum-question',
      name: 'Momentum Question',
      structure: ['describe the shift', 'name the leader', 'share your read', 'end with a direct question'],
      content: [
        'The feed is no longer just arguing about direction. It is hunting for the next symbol that can carry attention by itself.',
        `Right now ${s1} is still the leader, but ${s2 || s1} is starting to close the gap in discussion quality.`,
        `If you trade short term, I would watch ${k1} and ${k3 || k2 || k1} before watching raw emotion. Those signals usually show intent faster than price talk does.`,
        `My order is simple: watch ${s1} first, then see whether ${s2 || s1} confirms the spillover.`,
        'Would you rather trade the leader or position early in the second wave?'
      ].join('\n')
    }
  ];
}

function sanitizeSymbol(symbol) {
  return String(symbol || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function buildStyleVariant(symbol, context, style) {
  const [k1, k2, k3] = (context.keywords && context.keywords.length ? context.keywords : DEFAULT_KEYWORDS);
  const hotLeader = context.primarySymbol;

  switch (style) {
    case 'steady':
      return {
        style,
        title: `${symbol} Steady`,
        content: [
          `${symbol} is getting more attention, but the real question is whether the signal quality is improving with it.`,
          `If ${k1} and ${k2 || k1} keep showing up together, I would treat that as continuation instead of noise.`,
          'My default is still to wait for confirmation rather than chase the most emotional candle.',
          `Is ${symbol} on your watchlist right now?`
        ].join('\n')
      };
    case 'aggressive':
      return {
        style,
        title: `${symbol} Aggressive`,
        content: [
          `${symbol} is pulling in real attention, and short-term money is starting to cluster around it.`,
          `If ${k1} keeps strengthening, the move can expand faster than most people expect.`,
          'The risk is obvious, but so is the opportunity if the signal stays clean.',
          `Do you see ${symbol} as a starter move or the acceleration phase?`
        ].join('\n')
      };
    case 'debate':
      return {
        style,
        title: `${symbol} Debate`,
        content: [
          `A lot of people will call ${symbol} pure hype. I do not think it is that simple.`,
          `If ${k1} and ${k3 || k1} keep appearing together, that usually means real intent is hiding inside the noise.`,
          'The better question is not how much it moved today, but whether the attention can mature into a tradable theme.',
          `Is ${symbol} noise, or is the market still underpricing it?`
        ].join('\n')
      };
    default:
      return {
        style: 'educational',
        title: `${symbol} Educational`,
        content: [
          `If you are tracking ${symbol}, do not just watch the last candle.`,
          `A better read comes from three things: sustained attention, spillover from ${hotLeader}, and whether risk warnings rise with the hype.`,
          'The most useful posts are not the loudest ones. They usually combine a view, a trigger, and a risk condition.',
          `How do you decide whether ${symbol} is opportunity or trap?`
        ].join('\n')
      };
  }
}

function buildCoinVariants(context, styles, coinLimit) {
  const pickedSymbols = context.topSymbols.map(sanitizeSymbol).filter(Boolean).slice(0, Math.max(1, coinLimit));
  const fallbackSymbols = DEFAULT_SYMBOLS.map(item => item.replace('$', ''));
  const sourceSymbols = pickedSymbols.length ? pickedSymbols : fallbackSymbols.slice(0, Math.max(1, coinLimit));

  return sourceSymbols.map(symbol => ({
    symbol,
    variants: styles.map(style => buildStyleVariant(symbol, context, style))
  }));
}

function main() {
  const hotData = readJsonIfExists(HOT_POSTS_PATH);
  if (!hotData?.posts?.length) {
    throw new Error('No hot post data found. Run fetch-square-hot.js first.');
  }

  const config = loadConfig();
  const styles = Array.isArray(config.square?.hotGeneration?.styles) && config.square.hotGeneration.styles.length
    ? config.square.hotGeneration.styles
    : STYLE_LIBRARY;
  const coinLimit = Number(config.square?.hotGeneration?.coinLimit || 3);
  const posts = [...hotData.posts]
    .sort((a, b) => ((b.tradingSignalScore || 0) - (a.tradingSignalScore || 0)) || ((b.finalScore || 0) - (a.finalScore || 0)))
    .slice(0, 5);
  const context = makeContext(posts);
  const primaryPost = buildPrimaryPost(context);
  const viralTemplates = buildViralTemplates(context);
  const coinVariants = buildCoinVariants(context, styles, coinLimit);

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFetchedAt: hotData.fetchedAt,
    sourceUrl: hotData.source,
    sourcePosts: posts,
    context,
    primaryPost,
    viralTemplates,
    coinVariants
  };

  writeJson(OUTPUT_PATH, output);
  stateManager.setPendingPost(DEFAULT_GROUP_ID, primaryPost.content, 'hot-post', 30 * 60 * 1000, 'Hot-post draft generated');

  console.log(primaryPost.content);
  console.log('\n========== Viral Templates ==========' );
  viralTemplates.forEach((template, index) => {
    console.log(`\n[${index + 1}] ${template.name}`);
    console.log(template.content);
  });

  console.log('\n========== Coin Variants ==========' );
  coinVariants.forEach(group => {
    console.log(`\n${group.symbol}`);
    group.variants.forEach((variant, index) => {
      console.log(`\n(${index + 1}) ${variant.title}`);
      console.log(variant.content);
    });
  });

  console.log(`\nSaved generated hot post assets to ${OUTPUT_PATH}`);
}

try {
  main();
} catch (error) {
  console.error('Failed to generate hot post:', error.message);
  process.exit(1);
}
