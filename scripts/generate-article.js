#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const stateManager = require('./state-manager');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const REQUIRED_NEWS_COUNT = 5;
const REQUIRED_COIN_COUNT = 5;
const DEFAULT_GROUP_ID = 'oc_f0540e704bf850b75fb04c3ecbe4adea';
const FINAL_INTERACTION_LINE = '浣犳洿鍏虫敞鍝釜甯佺殑鐭嚎鏈轰細锛熸杩庣暀瑷€璁ㄨ銆?;

const newsTranslations = {
  'Florida Lawmakers Push Forward First State-Level Stablecoin Oversight Bill': '浣涚綏閲岃揪宸炶鍛樻帹杩涢涓窞绾хǔ瀹氬竵鐩戠娉曟',
  "Trump's National Cyber Strategy Backs Crypto Security in Post-Quantum Era": '鐗规湕鏅浗瀹剁綉缁滃畨鍏ㄦ垬鐣ユ敮鎸佸悗閲忓瓙鏃朵唬鐨勫姞瀵嗗畨鍏?,
  'Kalshi, Polymarket Discuss Fundraising at $20B Valuations: Report': 'Kalshi 涓?Polymarket 璁ㄨ浠?200 浜跨編鍏冧及鍊艰瀺璧?,
  'Washington Man Sentenced to 2 Years for Diverting $35M to Failed DeFi Platform': '鍗庣洓椤跨敺瀛愬洜灏?3500 涓囩編鍏冭浆鑷冲け璐?DeFi 骞冲彴琚垽 2 骞?,
  'Kalshi Faces Class Action Lawsuit Over Khamenei Prediction Market Payout': 'Kalshi 鍥犲搱姊呭唴浼婇娴嬪競鍦鸿禂浠橀棶棰橀伃閬囬泦浣撹瘔璁?,
  'Samson Mow Calls Bitcoin Exponential Gold Predicts What Will Happen': 'Samson Mow 绉版瘮鐗瑰竵鏄€滄寚鏁伴粍閲戔€濆苟棰勬祴鍚庣画璧板娍',
  'Post-Quantum Shift Could Force Crypto Exchanges to Rethink Wallet Security': '鍚庨噺瀛愯浆鍨嬪彲鑳借揩浣垮姞瀵嗕氦鏄撴墍閲嶆瀯閽卞寘瀹夊叏鏂规',
  'Aave Users Reach Record as Traders Quietly Shift Capital Toward DeFi Lending': 'Aave 鐢ㄦ埛鏁板垱绾綍锛岃祫閲戞鎮勭劧鍥炴祦 DeFi 鍊熻捶',
  'Crypto Funding Jumps +50% Year Over Year Despite Fewer Deals': '鍔犲瘑琛屼笟铻嶈祫棰濆悓姣斿闀?50%锛屽敖绠′氦鏄撴暟閲忓噺灏?,
  'Are Bitcoin And Tech Stocks Really Linked? NYDIG Says Not So Fast': '姣旂壒甯佷笌绉戞妧鑲℃槸鍚︾湡鐨勫己鐩稿叧锛烴YDIG 璁や负鏈繀',
  'Solana ETFs Build Serious Investor Base Outpacing Bitcoin': 'Solana ETF 姝ｅ缓绔嬫洿绋冲浐鐨勬姇璧勮€呭熀纭€锛屽閫熷揩浜庢瘮鐗瑰竵',
  'Bitcoin Slumps to $66K as Oil Breakout Adds Macro Pressure': '姣旂壒甯佽穼鑷?6.6 涓囩編鍏冿紝娌逛环绐佺牬鍔犲墽瀹忚鍘嬪姏',
  'Bitcoin USD Dominance Drops to 58%': '姣旂壒甯佺編鍏冧富瀵煎湴浣嶄笅闄嶈嚦 58%',
  'Smart Capital Rotating Into Ethereum': '鑱槑璧勯噾姝ｆ寔缁疆鍔ㄨ嚦浠ュお鍧?,
  'Solana ETFs Build Serious Investor Base': 'Solana ETF 姝ｅ缓绔嬬ǔ鍥烘姇璧勮€呭熀纭€',
  'Bitcoin Mining Is Leaving Earth': '姣旂壒甯佹寲鐭挎璧板悜澶┖鍦烘櫙'
};

const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency', 'blockchain', 'web3', 'defi', 'dao', 'nft',
  'stablecoin', 'token', 'tokens', 'wallet', 'exchange', 'binance', 'coinbase', 'solana', 'sol', 'xrp', 'ripple',
  'cardano', 'ada', 'dogecoin', 'doge', 'avalanche', 'avax', 'polygon', 'matic', 'uniswap', 'aave', 'maker',
  'compound', 'curve', 'pancakeswap', 'zcash', 'zec', 'mining', 'miner', 'layer2', 'etf', 'on-chain', 'onchain',
  'hashrate', 'staking', 'airdrop', 'altcoin', 'memecoin', 'regulation', 'sec', 'defi', '閽卞寘', '鍖哄潡閾?, '鍔犲瘑', '姣旂壒甯?,
  '浠ュお鍧?, '绋冲畾甯?, '浠ｅ竵', '浜ゆ槗鎵€', '鎸栫熆', '鐭垮伐', '閾句笂', '鍏摼', '鐩戠', '璐ㄦ娂'
];

const TITLE_BLACKLIST_PATTERNS = [
  /here'?s what happened in crypto today/i,
  /浠ヤ笅鏄粖澶╁姞瀵嗚揣甯佸彂鐢熺殑浜嬫儏/,
  /^crypto news$/i,
  /^daily crypto update$/i,
  /^latest crypto news$/i
];

const NON_CRYPTO_KEYWORDS = [
  'zoom', 'sonos', 'speaker', 'speakers', 'base layers', 'clothing', 'fashion', 'movie', 'music', 'recipe', 'travel',
  'hotel', 'car', 'automotive', 'medical', 'health', 'gaming laptop', 'iphone', 'android phone', 'review', 'best ',
  '鑰虫満', '闊崇', '鏈嶉グ', '瀹跺叿', '姹借溅', '鎵嬫満', '鐢佃剳', '娓告垙鏈?, '鐢靛奖', '闊充箰', '鍖荤枟', '鍋ュ悍', '鏃呮父', '閰掑簵', '娴嬭瘎', '鎺ㄨ崘', '鏈€浣?
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
    .replace(/[鈥溾€濃€樷€?'`]/g, '')
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
    console.log('馃摗 鍏堟姄鍙栨渶鏂拌祫璁?..\n');
    const child = spawn(process.execPath, [path.join(__dirname, 'fetch-news.js')], {
      cwd: path.join(__dirname, '..')
    });

    child.stdout.on('data', data => process.stdout.write(data));
    child.stderr.on('data', data => process.stderr.write(data));
    child.on('close', code => code === 0 ? resolve() : reject(new Error('鎶撳彇璧勮澶辫触')));
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
    console.error('鑾峰彇娉㈠姩甯佺澶辫触:', e.message);
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
  if (change24h >= 8) return '寮哄娍鎷夊崌锛岀煭绾挎儏缁亸鐑?;
  if (change24h >= 4) return '寤剁画鍙嶅脊锛岃祫閲戝洖娴佹槑鏄?;
  if (change24h > 0) return '娓╁拰璧板己锛屼繚鎸侀渿鑽′笂琛?;
  if (change24h <= -8) return '璺屽箙杈冩繁锛岀煭绾挎姏鍘嬫槑鏄?;
  if (change24h <= -4) return '寮卞娍鍥炶皟锛屾尝鍔ㄤ粛鍦ㄦ斁澶?;
  return '灏忓箙闇囪崱锛屾柟鍚戜粛寰呯‘璁?;
}

function generateTechnicalAnalysis(coins) {
  if (!coins || coins.length !== REQUIRED_COIN_COUNT) {
    throw new Error(`鎶€鏈潰鏁版嵁涓嶅畬鏁达紝棰勬湡 ${REQUIRED_COIN_COUNT} 涓竵锛屽疄闄?${coins ? coins.length : 0} 涓猔);
  }

  return coins.map((c, i) => {
    const trend = c.change24h >= 0 ? '馃搱 鐪嬫定' : '馃搲 鐪嬭穼';
    return `${i + 1}. $${c.symbol} (${c.name})\n- 褰撳墠浠锋牸: $${formatPrice(c.price)} | 24h娑ㄨ穼: ${(c.change24h > 0 ? '+' : '') + c.change24h.toFixed(2)}%\n- 24h鎴愪氦閲? ${formatCompactUsd(c.volume)} | 甯傚€兼帓鍚? #${c.rank}\n- 璧板娍鍒ゆ柇: ${trend} | ${getTrendDescription(c.change24h)}`;
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
    throw new Error(`璧勮閫熼€掓湭鍑戝 ${REQUIRED_NEWS_COUNT} 鏉★紝瀹為檯浠?${picked.length} 鏉°€傝妫€鏌ユ姄鍙栨簮鎴栬繃婊よ鍒欍€俙);
  }

  return picked;
}

async function generateArticle() {
  console.log('馃 鍔犲瘑璐у竵鏃ユ姤鐢熸垚鍣╘n');
  console.log('馃搨 妯″紡: crypto-only + 鍥哄畾妯℃澘 + 鍙戝竷鍓嶇‖鏍￠獙\n');

  await fetchNews();
  console.log('\n馃摑 姝ｅ湪鐢熸垚鏂囩珷...\n');

  const cachePath = path.join(__dirname, '../data/latest-news.json');
  if (!fs.existsSync(cachePath)) {
    throw new Error('鏈壘鍒?latest-news.json锛屾棤娉曠敓鎴愯祫璁€熼€?);
  }

  const news = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  const qualifiedNews = await buildQualifiedNews(news);
  const newsContent = `銆愯祫璁€熼€掋€慭n${qualifiedNews.map((item, i) => `${i + 1}. ${item.translated}`).join('\n')}`;

  console.log('馃搳 姝ｅ湪鑾峰彇鎶€鏈潰鏁版嵁...');
  const coins = await getTopVolatileCoins();
  const techContent = generateTechnicalAnalysis(coins);

  const today = new Date().toISOString().split('T')[0];
  const fullArticle = `馃摪 鍔犲瘑璐у竵鏃ユ姤 路 ${today}\n鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣\n${newsContent}\n\n銆愭妧鏈潰鍒嗘瀽 - 24h鐑棬娉㈠姩甯併€慭n\n${techContent}\n\n鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣\n${FINAL_INTERACTION_LINE}\n\n鍥炲銆岀‘璁ゅ彂閫併€嶁啋 鍙戝竷鍒板竵瀹塦;

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

  console.log('\n========== 鏂囩珷棰勮 ==========\n');
  console.log(fullArticle);
  console.log('\n================================\n');
  console.log('鉁?鏂囩珷宸茬敓鎴愶紝寰呭鏍?);
  console.log(`鉁?璧勮閫熼€? ${qualifiedNews.length} 鏉★紙crypto-only锛塦);
  console.log(`鉁?鎶€鏈潰鍒嗘瀽: ${coins.length} 涓竵`);

  stateManager.setPendingPost(DEFAULT_GROUP_ID, fullArticle, 'default', 30 * 60 * 1000, '妫€鏌ラ€氳繃');
  console.log('鉁?鐘舵€佸凡淇濆瓨鍒?state-manager');

  return article;
}

generateArticle().catch(error => {
  console.error('鉂?鐢熸垚澶辫触:', error.message);
  process.exit(1);
});

