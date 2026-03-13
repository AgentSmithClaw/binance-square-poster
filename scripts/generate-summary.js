#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function generateSummary(newsItems) {
  const selectedNews = newsItems.slice(0, 8);
  
  const content = selectedNews.map((item, i) => {
    const title = item.title || '';
    let coin = '📰';
    if (title.includes('BTC') || title.includes('Bitcoin')) coin = '$BTC';
    else if (title.includes('ETH') || title.includes('Ethereum')) coin = '$ETH';
    else if (title.includes('XRP')) coin = '$XRP';
    else if (title.includes('Solana') || title.includes('SOL')) coin = '$SOL';
    else if (title.includes('BNB')) coin = '$BNB';
    else if (title.includes('Doge') || title.includes('DOGE')) coin = '$DOGE';
    else if (title.includes('Binance')) coin = '🔵 币安';
    return (i + 1) + '. ' + coin + ' ' + title.substring(0, 80);
  }).join('\n');

  return {
    content: '📰 加密货币资讯摘要 ' + new Date().toISOString().slice(0,10) + '\n\n' + content,
    keywords: ['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'DOGE', 'Crypto', 'DeFi'],
    sentiment: 'neutral',
    newsCount: selectedNews.length
  };
}

async function main() {
  const cachePath = path.join(__dirname, '../data/latest-news.json');
  
  if (!fs.existsSync(cachePath)) {
    console.error('❌ 没有缓存的资讯，请先运行 fetch-news.js');
    process.exit(1);
  }
  
  const news = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  console.log('📰 正在生成摘要 (' + news.length + ' 条资讯)...');
  
  const summary = await generateSummary(news);
  
  const summaryPath = path.join(__dirname, '../data/today-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n📝 今日摘要:');
  console.log(summary.content);
  console.log('\n✅ 摘要已生成 (' + summary.newsCount + ' 条新闻)');
  
  return summary;
}

main().catch(console.error);
