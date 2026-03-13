#!/usr/bin/env node

/**
 * 加密货币资讯抓取脚本
 * 功能：从 RSS 源抓取最新资讯
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 简单 RSS 解析器
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const getTagContent = (tag) => {
      // 先尝试 CDATA
      let m = itemXml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i'));
      if (m) return m[1].trim();
      // 再尝试普通内容
      m = itemXml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };
    
    items.push({
      title: getTagContent('title'),
      link: getTagContent('link'),
      description: getTagContent('description'),
      pubDate: getTagContent('pubDate'),
      category: getTagContent('category')
    });
  }
  
  return items;
}

// 获取 RSS 内容
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const configPath = path.join(__dirname, '../config/config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  const allNews = [];
  
  for (const source of config.sources) {
    if (!source.enabled) continue;
    
    try {
      console.log(`📡 抓取 ${source.name}...`);
      const xml = await fetchRSS(source.url);
      const items = parseRSS(xml);
      
      // 只取最新的 5 条
      allNews.push(...items.slice(0, 5).map(item => ({
        ...item,
        source: source.name
      })));
      
      console.log(`✅ 获取 ${items.length} 条资讯`);
    } catch (e) {
      console.error(`❌ ${source.name} 抓取失败:`, e.message);
    }
  }
  
  // 保存到缓存
  const cachePath = path.join(__dirname, '../data/latest-news.json');
  fs.writeFileSync(cachePath, JSON.stringify(allNews, null, 2));
  
  console.log(`\n📊 共获取 ${allNews.length} 条资讯`);
  console.log(`💾 已缓存到 ${cachePath}`);
  
  return allNews;
}

main().catch(console.error);
