#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// 资讯翻译映射
const newsTranslations = {
  'Florida Lawmakers Push Forward First State-Level Stablecoin Oversight Bill': '佛罗里达州议员推进首个州级稳定币监管法案',
  'Trump\'s National Cyber Strategy Backs Crypto Security in Post-Quantum Era': '特朗普国家网络安全战略支持后量子时代的加密安全',
  'Kalshi, Polymarket Discuss Fundraising at $20B Valuations: Report': 'Kalshi和Polymarket讨论200亿美元估值融资',
  'Washington Man Sentenced to 2 Years for Diverting $35M to Failed DeFi Platform': '华盛顿男子因将3500万美元转移至失败的DeFi平台被判2年',
  'Kalshi Faces Class Action Lawsuit Over Khamenei Prediction Market Payout': 'Kalshi因哈梅内伊预测市场赔付面临集体诉讼'
};

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
    analysis += '   当前价格: $' + c.price.toLocaleString() + ' | 24h涨跌: ' + (c.change24h > 0 ? '+' : '') + c.change24h.toFixed(2) + '%\n';
    analysis += '   24h成交量: ' + vol + ' | 市值排名: #' + c.rank + '\n';
    analysis += '   走势判断: ' + trend + ' | ' + (Math.abs(c.change24h) > 5 ? '波动剧烈' : '小幅震荡');
    
    return analysis;
  }).join('\n\n');
}

// 生成完整文章
async function generateArticle() {
  console.log('正在生成文章...\n');
  
  const cachePath = path.join(__dirname, '../data/latest-news.json');
  let newsContent = '';
  
  if (fs.existsSync(cachePath)) {
    const news = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    const top5 = news.slice(0, 5);
    
    newsContent = '【资讯速递】\n\n';
    newsContent += top5.map(function(item, i) {
      let title = item.title || '';
      if (newsTranslations[title]) {
        title = newsTranslations[title];
      }
      return (i+1) + '. ' + title + '\n   来源: ' + (item.source || 'Cryptonews');
    }).join('\n\n');
  } else {
    newsContent = '暂无最新资讯';
  }
  
  console.log('正在获取技术面数据...');
  const coins = await getTopVolatileCoins();
  const techContent = generateTechnicalAnalysis(coins);
  
  const article = {
    part1: newsContent,
    part2: techContent,
    timestamp: new Date().toISOString(),
    coins: coins
  };
  
  const outputPath = path.join(__dirname, '../data/today-article.json');
  fs.writeFileSync(outputPath, JSON.stringify(article, null, 2));
  
  console.log('\n========== 文章预览 ==========\n');
  console.log(newsContent);
  console.log('\n\n【技术面分析 - 24h热门波动币】\n');
  console.log(techContent);
  console.log('\n================================\n');
  console.log('文章已生成，待审核');
  
  return article;
}

generateArticle().catch(console.error);
