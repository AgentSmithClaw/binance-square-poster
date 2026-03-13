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
  'FUTURE', 'BTCUSDT', 'ETHUSDT', 'USDT', 'USD'
]);

const DEFAULT_SYMBOLS = ['$BTC', '$ETH', '$SOL'];
const DEFAULT_TAGS = ['#BTC', '#ETH', '#市场观察'];
const DEFAULT_KEYWORDS = ['资金轮动', '情绪回暖', '短线博弈'];
const STYLE_LIBRARY = ['steady', 'aggressive', 'debate', 'educational'];

function toLocalTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour12: false,
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date).replace(/\//g, '-');
}

function frequencyMap(posts) {
  const score = new Map();

  for (const post of posts) {
    for (const symbol of post.symbols || []) {
      score.set(symbol, (score.get(symbol) || 0) + (post.finalScore || post.hotScore || 0));
    }

    for (const tag of post.hashtags || []) {
      score.set(tag, (score.get(tag) || 0) + (post.finalScore || post.hotScore || 0));
    }

    const words = String(post.title || post.excerpt || '')
      .toUpperCase()
      .match(/[A-Z]{3,}/g) || [];

    for (const word of words) {
      if (STOP_WORDS.has(word)) continue;
      score.set(word, (score.get(word) || 0) + Math.max(20, Math.round((post.finalScore || 0) / 50)));
    }
  }

  return Array.from(score.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token, score]) => ({ token, score }));
}

function extractCleanKeywords(ranked) {
  return ranked
    .map(item => String(item.token || '').trim())
    .filter(token => !token.startsWith('$'))
    .filter(token => !token.startsWith('#'))
    .filter(token => !STOP_WORDS.has(token.toUpperCase()))
    .slice(0, 5);
}

function summarizePosts(posts) {
  return posts.slice(0, 3).map((post, index) => {
    const hook = post.symbols[0] || post.hashtags[0] || '热门话题';
    const line = String(post.excerpt || post.title || '').replace(/\s+/g, ' ').trim();
    return `${index + 1}. ${hook}: ${line.slice(0, 56)}`;
  });
}

function makeContext(posts) {
  const ranked = frequencyMap(posts);
  const topSymbols = ranked.filter(item => item.token.startsWith('$')).slice(0, 5).map(item => item.token);
  const topTags = ranked.filter(item => item.token.startsWith('#')).slice(0, 5).map(item => item.token);
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

  if (/爆仓|止损|做空|做多|合约|杠杆/u.test(joined)) {
    return '合约情绪和短线博弈明显升温';
  }
  if (/突破|站稳|新高|拉升/u.test(joined)) {
    return '市场更偏向追逐突破和延续';
  }
  if (/回踩|支撑|震荡|反弹/u.test(joined)) {
    return '市场还在震荡区间里找方向';
  }
  return '市场情绪正在围绕热点币种快速轮动';
}

function detectRiskLine(posts) {
  const joined = posts.map(post => `${post.title} ${post.rawText}`).join(' ');

  if (/爆仓|杠杆|合约/u.test(joined)) {
    return '这类行情最怕的不是没机会，而是重仓上杠杆后被一次反抽打掉节奏。';
  }
  if (/突破|站稳/u.test(joined)) {
    return '真正能走远的不是第一次冲高，而是冲高之后还能稳住关键位置。';
  }
  return '越是热度上来的时候，越要先想清楚失效条件，再考虑进场。';
}

function buildPrimaryPost(context) {
  const [s1, s2, s3] = context.topSymbols;
  const angle = detectMarketAngle(context.topPosts);
  const riskLine = detectRiskLine(context.topPosts);
  const title = `币安广场热帖观察 | ${context.timestamp}`;
  const body = [
    title,
    '',
    '刚刷完这一轮广场热帖，我的直观感受是：',
    angle,
    '',
    `当前被反复提到最多的币种是 ${s1}、${s2 || s1}、${s3 || s2 || s1}。`,
    `对应的关注点主要集中在 ${context.keywords.join('、')}。`,
    '',
    '我整理出的热帖重点：',
    ...context.summaries,
    '',
    '我的判断：',
    `${s1} 仍然是现在最强的流量中心，但真正值得盯的，不只是它涨没涨，而是热度能不能继续外溢到第二梯队。`,
    riskLine,
    '如果你准备发帖，最容易出互动的写法，依然是“明确观点 + 条件判断 + 风险提醒”。',
    '',
    '你今天更关注哪个币的短线机会？欢迎留言交流。'
  ].join('\n');

  return { title, content: body };
}

function buildViralTemplates(context) {
  const [s1, s2, s3] = context.topSymbols;
  const [k1, k2, k3] = context.keywords;
  const tag = context.topTags[0] || '#交易';

  return [
    {
      templateId: 'contrarian-alert',
      name: '反常识预警型',
      structure: ['先抛出反常识观点', '对比主流预期', '点出关键条件', '给风控提醒', '用问题收尾'],
      content: [
        `很多人今天都在盯 ${s1}，但我反而觉得，真正值得提前看的是 ${s2 || s1}。`,
        `${s1} 的热度已经很高了，高热度不一定等于高性价比；真正容易放大利润的，往往是刚开始被市场重新定价的方向。`,
        `我现在最在意的不是它还能不能继续冲，而是 ${k1} 和 ${k2 || k1} 会不会同步强化。`,
        `如果 ${s1} 能稳住、${s2 || s1} 又开始放量，那情绪很可能继续扩散；如果量能跟不上，就别在高位硬接。`,
        `你觉得下一波更有弹性的，会是 ${s1} 还是 ${s2 || s1}？ ${tag}`.trim()
      ].join('\n')
    },
    {
      templateId: 'checklist-breakdown',
      name: '清单拆解型',
      structure: ['一句话结论', '三条观察', '执行建议', '评论区提问'],
      content: [
        `今天广场最强的讨论主线，基本都绕不开 ${s1}。`,
        '',
        '我会先盯这 3 件事：',
        `1. ${s1} 的热度有没有继续扩散到 ${s2 || s1}`,
        `2. ${k1} 和 ${k2 || k1} 是不是从情绪词，变成了真实交易信号`,
        `3. 热门帖里出现的风险提醒，是不是越来越多`,
        '',
        '如果这三条能同时成立，我才会把它当成可以跟的短线题材；少一条，都更像情绪冲高。',
        `你会把今天的主要注意力放在 ${s1}，还是 ${s3 || s2 || s1}？`
      ].join('\n')
    },
    {
      templateId: 'momentum-question',
      name: '情绪带问号型',
      structure: ['先说情绪变化', '点出强势币', '给出自己的看法', '结尾抛问题'],
      content: [
        '这两天广场的节奏很明显，大家已经不是在单纯讨论涨跌，而是在抢“下一只最能带情绪的币”。',
        `从我刷到的内容看，${s1} 还是流量中心，但 ${s2 || s1} 的讨论效率正在往上追。`,
        `如果你做短线，我更建议盯住 ${k1} 和 ${k3 || k2 || k1} 这两个信号，它们往往比价格更早暴露资金偏好。`,
        `我自己的顺序是先看 ${s1}，再看 ${s2 || s1} 有没有补涨确认。`,
        '你会先做龙头，还是先埋伏第二梯队？'
      ].join('\n')
    }
  ];
}

function sanitizeSymbol(symbol) {
  return String(symbol || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function buildStyleVariant(symbol, context, style) {
  const [k1, k2, k3] = context.keywords;
  const hotLeader = context.primarySymbol;

  switch (style) {
    case 'steady':
      return {
        style,
        title: `${symbol} 稳健版`,
        content: [
          `${symbol} 最近的讨论度明显在升温，但真正值得关注的，还是确认信号有没有跟上。`,
          `如果 ${k1} 和 ${k2 || k1} 同时强化，我会更愿意把它看成一段可以跟随的延续行情。`,
          '我的做法通常是先等回踩、等确认、再考虑跟，而不是在情绪最满的时候抢最后一棒。',
          `你会把 ${symbol} 放进这两天的重点观察列表吗？`
        ].join('\n')
      };
    case 'aggressive':
      return {
        style,
        title: `${symbol} 激进版`,
        content: [
          `${symbol} 这波热度不是假的，短线资金已经开始明显往这里堆。`,
          `只要 ${k1} 继续强化，这种情绪就可能进一步放大，拉升速度会比很多人预期更快。`,
          '这种时候最怕的不是没机会，而是看懂了却不敢上。',
          `你觉得 ${symbol} 这一脚是启动，还是要直接进入加速段？`
        ].join('\n')
      };
    case 'debate':
      return {
        style,
        title: `${symbol} 争议版`,
        content: [
          `很多人会把 ${symbol} 直接归类成情绪票，但我不完全认同。`,
          `如果它只是虚火，那 ${k1} 和 ${k3 || k1} 不会一起出现；一旦这两个信号共振，说明资金并不只是路过。`,
          '真正值得讨论的，不是它今天涨了多少，而是这种热度有没有可能演变成下一阶段主线。',
          `你站哪边，${symbol} 现在更像噪音，还是机会？`
        ].join('\n')
      };
    default:
      return {
        style: 'educational',
        title: `${symbol} 科普版`,
        content: [
          `如果你最近在看 ${symbol}，先别急着只盯涨跌。`,
          `更有用的看法通常来自三个维度：热度有没有持续、${hotLeader} 的强势有没有外溢、以及风险提示有没有同步增加。`,
          '短线交易真正有价值的信息，往往不是一句喊单，而是“观点 + 条件 + 风控”同时成立。',
          `你平时会怎么判断 ${symbol} 是机会，还是陷阱？`
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
  const posts = hotData.posts.slice(0, 5);
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
  stateManager.setPendingPost(DEFAULT_GROUP_ID, primaryPost.content, 'hot-post', 30 * 60 * 1000, '热帖草稿已生成');

  console.log(primaryPost.content);
  console.log('\n========== 仿爆款模板 ==========');
  viralTemplates.forEach((template, index) => {
    console.log(`\n[${index + 1}] ${template.name}`);
    console.log(template.content);
  });

  console.log('\n========== 币种多风格文案 ==========');
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