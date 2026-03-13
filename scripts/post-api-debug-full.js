#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('========== 完整调试: 发布前检查 ==========');

// 1. 读取配置
console.log('\n--- 步骤1: 读取 API_KEY ---');
const API_KEY = process.env.BINANCE_API_KEY;
console.log('typeof API_KEY:', typeof API_KEY);
console.log('API_KEY === true:', API_KEY === true);
console.log('API_KEY === false:', API_KEY === false);
if (!API_KEY) {
  console.error('❌ API_KEY 不存在');
  process.exit(1);
}
console.log('API_KEY 前8位:', API_KEY.substring(0, 8));

// 2. 读取文章文件
console.log('\n--- 步骤2: 读取文章文件 ---');
const dataDir = path.join(__dirname, '..', 'data');
const articleFile = path.join(dataDir, 'today-article.json');
console.log('articleFile:', articleFile);
console.log('file exists:', fs.existsSync(articleFile));

const articleData = JSON.parse(fs.readFileSync(articleFile, 'utf-8'));
console.log('Object.keys(articleData):', Object.keys(articleData));

// 3. 检查是否有错误的状态字段
console.log('\n--- 步骤3: 检查状态字段 ---');
const statusFields = ['status', 'draft_ready', 'news_status', 'ta_status', 'news_is_latest', 'ta_is_complete', 'draft_block_reason'];
statusFields.forEach(f => {
  if (articleData[f] !== undefined) {
    console.log(`articleData.${f}:`, articleData[f]);
  }
});

// 4. 提取 content
console.log('\n--- 步骤4: 提取 content ---');
let ARTICLE_CONTENT = articleData.full.replace('\n回复「确认发送」→ 发布到币安', '');

console.log('typeof ARTICLE_CONTENT:', typeof ARTICLE_CONTENT);
console.log('ARTICLE_CONTENT === true:', ARTICLE_CONTENT === true);
console.log('ARTICLE_CONTENT === false:', ARTICLE_CONTENT === false);
console.log('ARTICLE_CONTENT === "true":', ARTICLE_CONTENT === 'true');
console.log('ARTICLE_CONTENT.length:', ARTICLE_CONTENT.length);
console.log('ARTICLE_CONTENT.substring(0, 200):');
console.log(ARTICLE_CONTENT.substring(0, 200));

// 5. 构建 payload
console.log('\n--- 步骤5: 构建 payload ---');
const payload = {
  content: ARTICLE_CONTENT,
  bodyTextOnly: true,
  msgType: 'post'
};

console.log('typeof payload.content:', typeof payload.content);
console.log('payload.content === true:', payload.content === true);
console.log('payload.content === false:', payload.content === false);

// 6. rawBody
console.log('\n--- 步骤6: rawBody ---');
const rawBody = JSON.stringify(payload);
console.log('rawBody.length:', rawBody.length);
console.log('rawBody.substring(0, 300):');
console.log(rawBody.substring(0, 300));

// 7. 校验
console.log('\n--- 步骤7: 最终校验 ---');
if (typeof payload.content !== 'string') {
  console.error('❌ 错误: content 不是字符串，是', typeof payload.content);
  console.error('❌ 禁止发帖');
  process.exit(1);
}

if (payload.content === true || payload.content === 'true') {
  console.error('❌ 错误: content 是 true');
  console.error('❌ 禁止发帖');
  process.exit(1);
}

if (payload.content === false || payload.content === 'false') {
  console.error('❌ 错误: content 是 false');
  console.error('❌ 禁止发帖');
  process.exit(1);
}

if (payload.content.trim().length < 10) {
  console.error('❌ 错误: content 太短');
  console.error('❌ 禁止发帖');
  process.exit(1);
}

console.log('✅ 所有校验通过，准备发布');
console.log('\n========== 实际发布 ==========');
