#!/usr/bin/env node

const REQUIRED_INTERACTION = '你更关注哪个币的短线机会？欢迎留言讨论。';

function validateDailyReport(input) {
  const issues = [];
  const news = input.news || [];
  const analysis = input.analysis || [];
  const report = input.report || '';

  if (news.length !== 5) issues.push(`资讯速递必须正好 5 条，当前 ${news.length} 条`);
  if (analysis.length !== 5) issues.push(`技术面分析必须正好 5 个币，当前 ${analysis.length} 个`);

  const titleSet = new Set();
  news.forEach((item, idx) => {
    if (!item.title || !item.point || !item.impact) {
      issues.push(`第 ${idx + 1} 条资讯缺少 title/point/impact`);
    }
    const title = (item.title || '').trim();
    if (title) {
      if (titleSet.has(title)) issues.push(`资讯标题重复：${title}`);
      titleSet.add(title);
    }
    if (/来源[:：]/.test(JSON.stringify(item))) issues.push(`第 ${idx + 1} 条资讯仍带来源字段`);
  });

  analysis.forEach((item, idx) => {
    const required = ['symbol', 'name', 'price', 'change24h', 'volume24h', 'trend', 'observation'];
    required.forEach((field) => {
      if (item[field] === undefined || item[field] === null || item[field] === '') {
        issues.push(`第 ${idx + 1} 个币缺少字段 ${field}`);
      }
    });
    if (item.symbol && !String(item.symbol).startsWith('$')) {
      issues.push(`第 ${idx + 1} 个币 symbol 必须带 $：${item.symbol}`);
    }
  });

  if (report) {
    if (!report.includes('📰 加密货币日报 ·')) issues.push('缺少固定标题');
    if (!report.includes('【资讯速递】')) issues.push('缺少【资讯速递】板块');
    if (!report.includes('【技术面分析 - 24h热门波动币】')) issues.push('缺少【技术面分析 - 24h热门波动币】板块');
    if (/来源[:：]/.test(report)) issues.push('正文不允许包含来源');
    if (!report.includes(REQUIRED_INTERACTION)) issues.push('缺少固定互动引导');
    if (/TODO|待补充|undefined|null|这里发生什么/i.test(report)) issues.push('正文包含占位词或脏数据');
  }

  return { ok: issues.length === 0, issues };
}

module.exports = { validateDailyReport, REQUIRED_INTERACTION };

if (require.main === module) {
  const fs = require('fs');
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const result = validateDailyReport(input);
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
