#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const stateManager = require('./state-manager');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const REQUIRED_NEWS_COUNT = 5;
const REQUIRED_COIN_COUNT = 5;
const DEFAULT_GROUP_ID = 'oc_f0540e704bf850b75fb04c3ecbe4adea';
const FINAL_INTERACTION_LINE = '你更关注哪个币的短线机会？欢迎留言讨论。';

const newsTranslations = {
  'Florida Lawmakers Push Forward First State-Level Stablecoin Oversight Bill': '佛罗里达州议员推进首个州级稳定币监管法案',
  "Trump's National Cyber Strategy Backs Crypto Security in Post-Quantum Era": '特朗普国家网络安全战略支持后量子时代的加密安全',
  'Kalshi, Polymarket Discuss Fundraising at $20B Valuations: Report': 'Kalshi 与 Polymarket 讨论以 200 亿美元估值融资',
  'Washington Man Sentenced to 2 Years for Diverting $35M to Failed DeFi Platform': '华盛顿男子因将 3500 万美元转至失败 DeFi 平台被判 2 年',
  'Kalshi Faces Class Action Lawsuit Over Khamenei Prediction Market Payout': 'Kalshi 因哈梅内伊预测市场赔付问题遭遇集体诉讼',
  'Samson Mow Calls Bitcoin Exponential Gold Predicts What Will Happen': 'Samson Mow 称比特币是“指数黄金”并预测后续走势',
  'Post-Quantum Shift Could Force Crypto Exchanges to Rethink Wallet Security': '后量子转型可能迫使加密交易所重构钱包安全方案',
  'Aave Users Reach Record as Traders Quietly Shift Capital Toward DeFi Lending': 'Aave 用户数创纪录，资金正悄然回流 DeFi 借贷',
  'Crypto Funding Jumps +50% Year Over Year Despite Fewer Deals': '加密行业融资额同比增长 50%，尽管交易数量减少',
  'Are Bitcoin And Tech Stocks Really Linked? NYDIG Says Not So Fast': '比特币与科技股是否真的强相关？NYDIG 认为未必',
  'Solana ETFs Build Serious Investor Base Outpacing Bitcoin': 'Solana ETF 正建立更稳固的投资者基础，增速快于比特币',
  'Bitcoin Slumps to $66K as Oil Breakout Adds Macro Pressure': '比特币跌至 6.6 万美元，油价突破加剧宏观压力',
  'Bitcoin USD Dominance Drops to 58%': '比特币美元主导地位下降至 58%',
  'Smart Capital Rotating Into Ethereum': '聪明资金正持续轮动至以太坊',
  'Solana ETFs Build Serious Investor Base': 'Solana ETF 正建立稳固投资者基础',
  'Bitcoin Mining Is Leaving Earth': '比特币挖矿正走向太空场景'
};

const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency', 'blockchain', 'web3', 'defi', 'dao', 'nft',
  'stablecoin', 'token', 'tokens', 'wallet', 'exchange', 'binance', 'coinbase', 'solana', 'sol', 'xrp', 'ripple',
  'cardano', 'ada', 'dogecoin', 'doge', 'avalanche', 'avax', 'polygon', 'matic', 'uniswap', 'aave', 'maker',
  'compound', 'curve', 'pancakeswap', 'zcash', 'zec', 'mining', 'miner', 'layer2', 'etf', 'on-chain', 'onchain',
  'hashrate', 'staking', 'airdrop', 'altcoin', 'memecoin', 'regulation', 'sec', 'defi', '钱包', '区块链', '加密', '比特币',
  '以太坊', '稳定币', '代币', '交易所', '挖矿', '矿工', '链上', '公链', '监管', '质押'
];

const TITLE_BLACKLIST_PATTERNS = [
  /here'?s what happened in crypto today/i,
  /以下是今天加密货币发生的事情/,
  /^crypto news$/i,
  /^daily crypto update$/i,
  /^latest crypto news$/i
];

const NON_CRYPTO_KEYWORDS = [
  'zoom', 'sonos', 'speaker', 'speakers', 'base layers', 'clothing', 'fashion', 'movie', 'music', 'recipe', 'travel',
  'hotel', 'car', 'automotive', 'medical', 'health', 'gaming laptop', 'iphone', 'android phone', 'review', 'best ',
  '耳机', '音箱', '服饰', '家具', '汽车', '手机', '电脑', '游戏本', '电影', '音乐', '医疗', '健康', '旅游', '酒店', '测评', '推荐', '最佳'
];

function cleanHtmlEntities(str) {
  return String(str || '')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeTitle(str) {
  return cleanHtmlEntities(str)
    .replace(/<[^>]+>/g, ' ')
    .replace(/[“”‘’"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeDedupKey(str) {
  return normalizeTitle(str)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '')
    .slice(0, 80);
}

function looksLikeEnglish(str) {
  const letters = (str.match(/[A-Za-z]/g) || []).length;
  const chinese = (str.match(/[\u4e00-\u9fa5]/g) || []).length;
  return letters > 12 && chinese === 0;
}

function isBlacklistedTitle(title) {
  return TITLE_BLACKLIST_PATTERNS.some(pattern => pattern.test(title));
}

function isCryptoRelated(title, category = '') {
  const lower = `${title} ${category}`.toLowerCase();
  if (NON_CRYPTO_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()))) {
    return false;
  }
  return CRYPTO_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()));
}

async function translateToChinese(title) {
  const cleaned = normalizeTitle(title);
  if (newsTranslations[cleaned]) return newsTranslations[cleaned];

  for (const [eng, chn] of Object.entries(newsTranslations)) {
    const normalizedEng = normalizeTitle(eng);
    if (cleaned === normalizedEng) return chn;
  }

  try {
    const encoded = encodeURIComponent(cleaned);
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh`);
    const data = await response.json();
    const translated = normalizeTitle(data?.responseData?.translatedText || '');
    if (translated) return translated;
  } catch (_) {}

  return cleaned;
}

function fetchNews() {
  return new Promise((resolve, reject) => {
    console.log('📡 先抓取最新资讯...\n');
    const child = spawn('node', [path.join(__dirname, 'fetch-news.js')], {
      cwd: path.join(__dirname, '..')
    });

    child.stdout.on('data', data => process.stdout.write(data));
    child.stderr.on('data', data => process.stderr.write(data));
    child.on('close', code => code === 0 ? resolve() : reject(new Error('抓取资讯失败')));
  });
}

async function getTopVolatileCoins() {
  try {
    const response = await fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=volume_desc&per_page=30&page=1&sparkline=false&price_change_percentage=24h`);
    const coins = await response.json();
    return coins
      .filter(c => c && c.price_change_percentage_24h !== null && c.market_cap_rank)
      .sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h))
      .slice(0, REQUIRED_COIN_COUNT)
      .map(c => ({
        symbol: String(c.symbol || '').toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: c.price_change_percentage_24h || 0,
        volume: c.total_volume,
        marketCap: c.market_cap,
        rank: c.market_cap_rank
      }));
  } catch (e) {
    console.error('获取波动币种失败:', e.message);
    return [];
  }
}

function formatPrice(value) {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value >= 0.1) return value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatCompactUsd(value) {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  return `$${(value / 1e6).toFixed(2)}M`;
}

function getTrendDescription(change24h) {
  if (change24h >= 8) return '强势拉升，短线情绪偏热';
  if (change24h >= 4) return '延续反弹，资金回流明显';
  if (change24h > 0) return '温和走强，保持震荡上行';
  if (change24h <= -8) return '跌幅较深，短线抛压明显';
  if (change24h <= -4) return '弱势回调，波动仍在放大';
  return '小幅震荡，方向仍待确认';
}

function generateTechnicalAnalysis(coins) {
  if (!coins || coins.length !== REQUIRED_COIN_COUNT) {
    throw new Error(`技术面数据不完整，预期 ${REQUIRED_COIN_COUNT} 个币，实际 ${coins ? coins.length : 0} 个`);
  }

  return coins.map((c, i) => {
    const trend = c.change24h >= 0 ? '📈 看涨' : '📉 看跌';
    return `${i + 1}. $${c.symbol} (${c.name})\n- 当前价格: $${formatPrice(c.price)} | 24h涨跌: ${(c.change24h > 0 ? '+' : '') + c.change24h.toFixed(2)}%\n- 24h成交量: ${formatCompactUsd(c.volume)} | 市值排名: #${c.rank}\n- 走势判断: ${trend} | ${getTrendDescription(c.change24h)}`;
  }).join('\n\n');
}

function validateTranslatedTitle(title) {
  const normalized = normalizeTitle(title);
  if (!normalized) return false;
  if (isBlacklistedTitle(normalized)) return false;
  if (looksLikeEnglish(normalized)) return false;
  if (!isCryptoRelated(normalized)) return false;
  return true;
}

async function buildQualifiedNews(news) {
  const sorted = [...news].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const picked = [];
  const seen = new Set();

  for (const item of sorted) {
    if (picked.length >= REQUIRED_NEWS_COUNT) break;
    const rawTitle = normalizeTitle(item.title || '');
    if (!rawTitle) continue;
    if (isBlacklistedTitle(rawTitle)) continue;
    if (!isCryptoRelated(rawTitle, item.category || '')) continue;

    const dedupKey = makeDedupKey(rawTitle);
    if (!dedupKey || seen.has(dedupKey)) continue;

    const translated = await translateToChinese(rawTitle);
    if (!validateTranslatedTitle(translated)) continue;

    seen.add(dedupKey);
    picked.push({
      original: rawTitle,
      translated: normalizeTitle(translated),
      pubDate: item.pubDate,
      category: item.category || ''
    });
  }

  if (picked.length !== REQUIRED_NEWS_COUNT) {
    throw new Error(`资讯速递未凑够 ${REQUIRED_NEWS_COUNT} 条，实际仅 ${picked.length} 条。请检查抓取源或过滤规则。`);
  }

  return picked;
}

async function generateArticle() {
  console.log('🦞 加密货币日报生成器\n');
  console.log('📂 模式: crypto-only + 固定模板 + 发布前硬校验\n');

  await fetchNews();
  console.log('\n📝 正在生成文章...\n');

  const cachePath = path.join(__dirname, '../data/latest-news.json');
  if (!fs.existsSync(cachePath)) {
    throw new Error('未找到 latest-news.json，无法生成资讯速递');
  }

  const news = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  const qualifiedNews = await buildQualifiedNews(news);
  const newsContent = `【资讯速递】\n${qualifiedNews.map((item, i) => `${i + 1}. ${item.translated}`).join('\n')}`;

  console.log('📊 正在获取技术面数据...');
  const coins = await getTopVolatileCoins();
  const techContent = generateTechnicalAnalysis(coins);

  const today = new Date().toISOString().split('T')[0];
  const fullArticle = `📰 加密货币日报 · ${today}\n━━━━━━━━━━━━━━\n${newsContent}\n\n【技术面分析 - 24h热门波动币】\n\n${techContent}\n\n━━━━━━━━━━━━━━\n${FINAL_INTERACTION_LINE}\n\n回复「确认发送」→ 发布到币安`;

  const article = {
    part1: newsContent,
    part2: techContent,
    full: fullArticle,
    timestamp: new Date().toISOString(),
    coins,
    news: qualifiedNews,
    metadata: {
      mode: 'crypto-only',
      newsCount: qualifiedNews.length,
      coinCount: coins.length,
      interactionLine: FINAL_INTERACTION_LINE
    }
  };

  const outputPath = path.join(__dirname, '../data/today-article.json');
  fs.writeFileSync(outputPath, JSON.stringify(article, null, 2));

  console.log('\n========== 文章预览 ==========\n');
  console.log(fullArticle);
  console.log('\n================================\n');
  console.log('✅ 文章已生成，待审核');
  console.log(`✅ 资讯速递: ${qualifiedNews.length} 条（crypto-only）`);
  console.log(`✅ 技术面分析: ${coins.length} 个币`);

  stateManager.setPendingPost(DEFAULT_GROUP_ID, fullArticle, 'default', 30 * 60 * 1000, '检查通过');
  console.log('✅ 状态已保存到 state-manager');

  return article;
}

generateArticle().catch(error => {
  console.error('❌ 生成失败:', error.message);
  process.exit(1);
});
