#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const stateManager = require('./state-manager');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// 资讯翻译映射
const newsTranslations = {
  'Florida Lawmakers Push Forward First State-Level Stablecoin Oversight Bill': '佛罗里达州议员推进首个州级稳定币监管法案',
  'Trump\'s National Cyber Strategy Backs Crypto Security in Post-Quantum Era': '特朗普国家网络安全战略支持后量子时代的加密安全',
  'Kalshi, Polymarket Discuss Fundraising at $20B Valuations: Report': 'Kalshi和Polymarket讨论200亿美元估值融资',
  'Washington Man Sentenced to 2 Years for Diverting $35M to Failed DeFi Platform': '华盛顿男子因将3500万美元转移至失败的DeFi平台被判2年',
  'Kalshi Faces Class Action Lawsuit Over Khamenei Prediction Market Payout': 'Kalshi因哈梅内伊预测市场赔付面临集体诉讼',
  'Samson Mow Calls Bitcoin Exponential Gold Predicts What Will Happen': 'Samson Mow称比特币为"指数黄金"预测未来走势',
  'Post-Quantum Shift Could Force Crypto Exchanges to Rethink Wallet Security': '后量子时代转移可能迫使加密交易所重新考虑钱包安全',
  'Aave Users Reach Record as Traders Quietly Shift Capital Toward DeFi Lending': 'Aave用户创纪录，交易者悄然将资金转向DeFi借贷',
  'Crypto Funding Jumps +50% Year Over Year Despite Fewer Deals': '加密货币融资同比增长50% 尽管交易数量减少',
  'Are Bitcoin And Tech Stocks Really Linked? NYDIG Says Not So Fast': '比特币和科技股真的相关？NYDIG称未必',
  'Best Sonos Speakers (2026)': '2026年最佳Sonos音箱',
  'Solana ETFs Build Serious Investor Base Outpacing Bitcoin': 'Solana ETF建立认真投资者基础 超越比特币',
  'Bitcoin Slumps to $66K as Oil Breakout Adds Macro Pressure': '比特币跌至66K 油价突破加剧宏观压力',
  'Bitcoin USD Dominance Drops to 58%': '比特币美元主导权降至58%',
  'Smart Capital Rotating Into Ethereum': '聪明资金正在转向以太坊',
  'Solana ETFs Build Serious Investor Base': 'Solana ETF建立认真投资者基础',
  'Bitcoin Mining Is Leaving Earth': '比特币挖矿进军太空',
  'Zoox starts mapping': 'Zoox开始测绘',
  'Best Base Layers': '2026年最佳内层服饰'
};

// 清理HTML实体
function cleanHtmlEntities(str) {
  return str
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// 同步翻译函数 - 使用MyMemory免费API
async function translateToChinese(title) {
  // 先清理HTML实体
  title = cleanHtmlEntities(title);
  
  // 先检查本地映射表
  if (newsTranslations[title]) {
    return newsTranslations[title];
  }
  
  // 检查部分匹配
  for (const [eng, chn] of Object.entries(newsTranslations)) {
    const cleanTitle = title.replace(/[,'":]/g, '').replace(/\s+/g, ' ').trim();
    const cleanEng = eng.replace(/[,'":]/g, '').replace(/\s+/g, ' ').trim();
    if (cleanTitle.includes(cleanEng) || cleanEng.includes(cleanTitle.substring(0, 25))) {
      return chn;
    }
  }
  
  // 使用MyMemory免费API翻译
  try {
    const encoded = encodeURIComponent(title);
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|zh`);
    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (e) {
    // 翻译失败返回原文
  }
  
  return title;
}

// 先抓取最新资讯
function fetchNews() {
  return new Promise((resolve, reject) => {
    console.log('📡 先抓取最新资讯...\n');
    const child = spawn('node', [path.join(__dirname, 'fetch-news.js')], {
      cwd: path.join(__dirname, '..')
    });
    
    child.stdout.on('data', data => process.stdout.write(data));
    child.stderr.on('data', data => process.stderr.write(data));
    
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error('抓取资讯失败'));
    });
  });
}

// 获取热门币种
async function getTopVolatileCoins() {
  try {
    const response = await fetch(COINGECKO_API + '/coins/markets?vs_currency=usd&order=volume_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h');
    const coins = await response.json();
    
    const sorted = coins
      .filter(function(c) { return c.price_change_percentage_24h !== null; })
      .sort(function(a, b) { 
        return Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h); 
      })
      .slice(0, 5);
    
    return sorted.map(function(c) {
      return {
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: c.price_change_percentage_24h || 0,
        volume: c.total_volume,
        marketCap: c.market_cap,
        rank: c.market_cap_rank
      };
    });
  } catch (e) {
    console.error('获取波动币种失败:', e.message);
    return [];
  }
}

// 生成技术分析
function generateTechnicalAnalysis(coins) {
  if (!coins || coins.length === 0) return '获取数据失败';
  
  return coins.map(function(c, i) {
    const trend = c.change24h > 0 ? '📈 看涨' : '📉 看跌';
    const vol = c.volume > 1e9 ? '$' + (c.volume/1e9).toFixed(2) + 'B' : '$' + (c.volume/1e6).toFixed(2) + 'M';
    
    let analysis = (i+1) + '. $' + c.symbol + ' (' + c.name + ')\n';
    analysis += '- 当前价格: $' + c.price.toLocaleString() + ' | 24h涨跌: ' + (c.change24h > 0 ? '+' : '') + c.change24h.toFixed(2) + '%\n';
    analysis += '- 24h成交量: ' + vol + ' | 市值排名: #' + c.rank + '\n';
    analysis += '- 走势判断: ' + trend + ' | ' + (Math.abs(c.change24h) > 5 ? '波动剧烈' : '小幅震荡');
    
    return analysis;
  }).join('\n\n');
}

// 按分类获取资讯（带去重）
function getNewsByCategories(news, categories) {
  if (!news || news.length === 0) {
    return [];
  }
  
  const result = [];
  const seenTitles = new Set();
  const categoryMap = {};
  
  // 先按时间排序
  const sorted = [...news].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  
  for (const item of sorted) {
    // 清理标题用于比较（去除特殊字符，转小写）
    const cleanTitle = (item.title || '')
      .replace(/[&#\/'"]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .substring(0, 50); // 只比较前50字符
    
    // 跳过已存在的相似标题
    let isDuplicate = false;
    for (const seen of seenTitles) {
      // 计算相似度
      const similarity = cleanTitle.split(' ').filter(w => seen.includes(w)).length;
      if (similarity >= 3 || cleanTitle.includes(seen) || seen.includes(cleanTitle)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (isDuplicate) continue;
    
    const cat = item.category || '其他';
    
    if (!categories || categories.length === 0) {
      // 无分类要求，直接添加
      result.push(item);
      seenTitles.add(cleanTitle);
    } else if (categories.includes(cat)) {
      // 有分类要求
      if (!categoryMap[cat]) {
        categoryMap[cat] = true;
        result.push(item);
        seenTitles.add(cleanTitle);
      }
    }
    
    if (result.length >= 10) break;
  }
  
  return result.slice(0, 5);
}

// 生成完整文章
async function generateArticle() {
  console.log('🦞 加密货币日报生成器\n');
  console.log('📂 支持多分类: 加密货币 | 科技 | AI | 金融\n');
  
  // 先抓取最新资讯
  await fetchNews();
  
  console.log('\n📝 正在生成文章...\n');
  
  const cachePath = path.join(__dirname, '../data/latest-news.json');
  let newsContent = '';
  
  if (fs.existsSync(cachePath)) {
    const news = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    
    // 默认多分类混合：2加密货币 + 2科技/AI + 1其他（去重）
    const cryptoCats = ['Bitcoin', 'Altcoin News', 'Crypto Regulation News'];
    const techCats = ['AI', 'Technology', 'Gaming', 'Gear', 'Transportation'];
    
    // 按时间排序
    const sorted = [...news].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 用于去重
    const usedKeys = new Set();
    
    function markUsed(title) {
      const key = title.substring(0, 25).toLowerCase().replace(/[^a-z0-9]/g, '');
      usedKeys.add(key);
    }
    
    function isUsed(title) {
      const key = title.substring(0, 25).toLowerCase().replace(/[^a-z0-9]/g, '');
      return usedKeys.has(key);
    }
    
    // 获取加密货币资讯（去重）
    const cryptoNews = [];
    for (const item of sorted) {
      if (cryptoNews.length >= 2) break;
      if (cryptoCats.some(cat => (item.category || '').includes(cat))) {
        if (!isUsed(item.title)) {
          cryptoNews.push(item);
          markUsed(item.title);
        }
      }
    }
    
    // 获取科技/AI资讯（去重）
    const techNews = [];
    for (const item of sorted) {
      if (techNews.length >= 2) break;
      if (techCats.some(cat => (item.category || '').includes(cat))) {
        if (!isUsed(item.title)) {
          techNews.push(item);
          markUsed(item.title);
        }
      }
    }
    
    // 获取其他资讯（去重）- 改为取更多备用
    const otherNews = [];
    for (const item of sorted) {
      if (otherNews.length >= 3) break;  // 增加到3条备用
      if (!isUsed(item.title)) {
        otherNews.push(item);
        markUsed(item.title);
      }
    }
    
    // 确保凑够5条：先取2+2+1，不够再从other补
    let mixed = [...cryptoNews, ...techNews, ...otherNews];
    while (mixed.length < 5 && otherNews.length > 0) {
      // 从otherNews中补充
      const extra = otherNews.shift();
      if (extra) mixed.push(extra);
    }
    mixed = mixed.slice(0, 5);
    
    newsContent = '【资讯速递】\n';
    const translated = await Promise.all(mixed.map(async function(item, i) {
      let title = item.title || '';
      title = await translateToChinese(title);
      let link = item.link || '';
      return (i+1) + '. ' + title;
    }));
    newsContent += translated.join('\n');
  } else {
    newsContent = '暂无最新资讯';
  }
  
  console.log('📊 正在获取技术面数据...');
  const coins = await getTopVolatileCoins();
  const techContent = generateTechnicalAnalysis(coins);
  
  // 按照SKILL模板格式组装完整文章
  const today = new Date().toISOString().split('T')[0];
  const fullArticle = `📰 加密货币日报 · ${today}
━━━━━━━━━━━━━━
${newsContent}

【技术面分析 - 24h热门波动币】

${techContent}
━━━━━━━━━━━━━━
回复「确认发送」→ 发布到币安`;
  
  const article = {
    part1: newsContent,
    part2: techContent,
    full: fullArticle,
    timestamp: new Date().toISOString(),
    coins: coins
  };
  
  const outputPath = path.join(__dirname, '../data/today-article.json');
  fs.writeFileSync(outputPath, JSON.stringify(article, null, 2));
  
  console.log('\n========== 文章预览 ==========\n');
  console.log(fullArticle);
  console.log('\n================================\n');
  console.log('✅ 文章已生成，待审核');
  console.log('📌 资讯分类: 2条加密货币 + 2条科技/AI + 1条其他');
  
  // 保存状态到 state-manager
  const groupId = 'oc_f0540e704bf850b75fb04c3ecbe4adea'; // 默认群ID
  stateManager.setPendingPost(groupId, fullArticle, 'default', 30 * 60 * 1000, '检查通过');
  console.log('✅ 状态已保存到 state-manager');
  
  return article;
}

generateArticle().catch(console.error);
