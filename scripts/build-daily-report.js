#!/usr/bin/env node

function ensureDollarSymbol(symbol = '') {
  const clean = String(symbol).replace(/^\$/,'').trim().toUpperCase();
  return clean ? `$${clean}` : '$UNKNOWN';
}

function formatPrice(value) {
  if (value === undefined || value === null || value === '') return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const digits = num >= 1000 ? 0 : num >= 1 ? 2 : 4;
  return `$${num.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits === 0 ? 0 : undefined })}`;
}

function formatPercent(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? 'N/A');
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

function formatVolume(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? 'N/A');
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(0)}`;
}

function buildDailyReport({ date, news = [], analysis = [], summary = '', interactionLine = '你更关注哪个币的短线机会？欢迎留言讨论。' }) {
  const lines = [];
  lines.push(`📰 加密货币日报 · ${date}`);
  lines.push('━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('【资讯速递】');
  lines.push('');

  news.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`);
    lines.push(`- 要点：${item.point}`);
    lines.push(`- 影响：${item.impact}`);
    lines.push('');
  });

  lines.push('【技术面分析 - 24h热门波动币】');
  lines.push('');

  analysis.forEach((item, index) => {
    const symbol = ensureDollarSymbol(item.symbol);
    const name = item.name || symbol.replace('$', '');
    lines.push(`${index + 1}. ${symbol} (${name})`);
    lines.push(`- 当前价格：${formatPrice(item.price)} | 24h涨跌：${formatPercent(item.change24h)}`);
    lines.push(`- 24h成交量：${formatVolume(item.volume24h)}`);
    lines.push(`- 走势判断：${item.trend}`);
    lines.push(`- 观察：${item.observation}`);
    lines.push('');
  });

  lines.push('━━━━━━━━━━━━━━');
  lines.push(`总结：${summary}`);
  lines.push('');
  lines.push(interactionLine);

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { buildDailyReport, ensureDollarSymbol, formatPrice, formatPercent, formatVolume };

if (require.main === module) {
  const fs = require('fs');
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  process.stdout.write(buildDailyReport(input));
}
