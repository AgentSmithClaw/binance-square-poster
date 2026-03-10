#!/usr/bin/env node

/**
 * 币安广场API发帖脚本
 * 使用官方OpenAPI接口发帖
 * 
 * 防复发修复 (2026-03-10):
 * 1. 校验 content 存在、字符串、非空
 * 2. 明确 payload 格式
 * 3. 发送前打印调试信息
 * 4. 发布后校验正文长度
 * 5. API_KEY 从环境变量读取
 */

const fs = require('fs');
const path = require('path');

// 从环境变量读取 API_KEY
// 统一只使用 BINANCE_API_KEY
const API_KEY = process.env.BINANCE_API_KEY;
if (!API_KEY) {
  console.error("❌ 错误: 未配置 BINANCE_API_KEY，请先在 ~/.openclaw/openclaw.json 中配置");
  process.exit(1);
}
// 仅 debug 模式打印 key 前后缀
if (process.env.DEBUG === 'true') {
  console.log("✅ API_KEY 来源: BINANCE_API_KEY (前缀: " + API_KEY.substring(0, 8) + "...后缀: ..." + API_KEY.substring(API_KEY.length - 4) + ")");
}

// 读取最新生成的文章
const dataDir = path.join(__dirname, '..', 'data');
const articleFile = path.join(dataDir, 'today-article.json');

let ARTICLE_CONTENT;
if (fs.existsSync(articleFile)) {
  const articleData = JSON.parse(fs.readFileSync(articleFile, 'utf-8'));
  // 去掉最后的"回复确认发送"提示
  ARTICLE_CONTENT = articleData.full.replace('\n回复「确认发送」→ 发布到币安', '');
} else {
  console.error('❌ 未找到生成的文章，请先运行 generate-article.js');
  process.exit(1);
}

/**
 * 校验 content 是否有效
 */
function validateContent(content) {
  console.log('\n========== content 校验 ==========');
  console.log('typeof content:', typeof content);
  console.log('content.length:', typeof content === 'string' ? content.length : 'N/A');
  
  if (content === undefined || content === null) {
    throw new Error('❌ content 不存在 (undefined/null)');
  }
  
  if (typeof content !== 'string') {
    throw new Error(`❌ content 不是字符串，是 ${typeof content}`);
  }
  
  if (content.trim().length === 0) {
    throw new Error('❌ content 为空字符串');
  }
  
  console.log('✅ content 校验通过');
  return true;
}

/**
 * 构造 payload（固定格式）
 */
function buildPayload(content) {
  // 官方文档: bodyTextOnly 字段直接等于正文内容（字符串类型）
  const payload = {
    bodyTextOnly: content
  };
  
  console.log('\n========== payload 构造 ==========');
  console.log('Object.keys(payload):', Object.keys(payload));
  console.log('JSON.stringify(payload, null, 2):');
  console.log(JSON.stringify(payload, null, 2));
  
  // ===== 防回退硬校验 =====
  // 1. 必须只有 bodyTextOnly 一个字段
  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== 'bodyTextOnly') {
    throw new Error('❌ 禁止：payload 必须是 { bodyTextOnly: "正文内容" }，禁止包含其他字段');
  }
  
  // 2. bodyTextOnly 必须是字符串
  if (typeof payload.bodyTextOnly !== 'string') {
    throw new Error('❌ 禁止：bodyTextOnly 必须是字符串类型，禁止布尔值');
  }
  
  // 3. bodyTextOnly 必须是正文字符串
  if (!payload.bodyTextOnly || payload.bodyTextOnly.trim() === '') {
    throw new Error('❌ 禁止：bodyTextOnly 不能为空');
  }
  // =========================
  
  return payload;
}

/**
 * 校验内容质量（2026-03-10新增）
 * 最低可发布标准：
 * - 有标题（含日期）
 * - 有【资讯速递】且至少 3 条
 * - 有【技术面分析】且至少 3 个币
 * - 有完整结构
 * - 不像占位文案/测试样例
 */
function validateContentQuality(content) {
  console.log('\n========== 内容质量校验 ==========');
  
  const issues = [];
  
  // 检查1: 有标题（含日期）
  if (!content.includes('📰') && !content.includes('日报') && !content.includes('Daily')) {
    issues.push('❌ 缺少标题');
  } else {
    console.log('✅ 有标题');
  }
  
  // 检查2: 有【资讯速递】且至少 3 条
  const newsMatch = content.match(/【资讯速递】/);
  const techHeaderRegex = /【技术面分析(?:\s*-\s*24h热门波动币)?】/;
  if (!newsMatch) {
    issues.push('❌ 缺少【资讯速递】板块');
  } else {
    // 检查资讯数量
    const newsSection = content.split(techHeaderRegex)[0] || content;
    const newsCount = (newsSection.match(/^\d+\./gm) || []).length;
    if (newsCount < 3) {
      issues.push(`❌ 资讯速递只有 ${newsCount} 条，少于 3 条`);
    } else {
      console.log(`✅ 资讯速递有 ${newsCount} 条`);
    }
  }
  
  // 检查3: 有【技术面分析】且至少 3 个币
  const techMatch = content.match(techHeaderRegex);
  if (!techMatch) {
    issues.push('❌ 缺少【技术面分析】板块');
  } else {
    const techSection = content.split(techHeaderRegex)[1] || '';
    const coinCount = (techSection.match(/\$[A-Z]+/g) || []).length;
    if (coinCount < 3) {
      issues.push(`❌ 技术面分析只有 ${coinCount} 个币，少于 3 个`);
    } else {
      console.log(`✅ 技术面分析有 ${coinCount} 个币`);
    }
  }
  
  // 检查4: 有完整结构（不是简单涨跌幅拼接）
  const hasStructure = content.includes('━━━━') || content.includes('---') || content.includes('\n\n');
  if (!hasStructure && content.length < 100) {
    issues.push('❌ 内容过短，不像完整帖子');
  } else {
    console.log('✅ 有完整结构');
  }
  
  // 检查5: 不像占位文案/测试样例
  const isPlaceholder = /^(测试|test|TEST|HELLO|Minimal)[\s\d]*$/i.test(content.trim());
  if (isPlaceholder) {
    issues.push('❌ 内容像测试样例/占位文案');
  } else {
    console.log('✅ 不像占位文案');
  }
  
  // 输出结果
  if (issues.length > 0) {
    console.log('\n⚠️ 内容质量检查未通过:');
    issues.forEach(i => console.log(i));
    throw new Error('❌ 内容质量不达标，已拒绝发布。请生成温和改写版后重新审核。');
  }
  
  console.log('✅ 内容质量检查通过');
  return true;
}

/**
 * 发送请求
 */
async function postToBinanceAPI(payload) {
  const response = await fetch('https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Square-OpenAPI-Key': API_KEY,
      'clienttype': 'binanceSkill'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  return data;
}

/**
 * 校验发布结果
 * 尝试获取帖子详情验证实际正文长度
 */
async function validatePostResult(result) {
  console.log('\n========== 发布结果校验 ==========');
  console.log('API 返回:', JSON.stringify(result, null, 2));
  
  if (!result.success) {
    throw new Error(`❌ 发布失败: ${result.message || result.msg || '未知错误'}`);
  }
  
  const postId = result.data?.id || result.data?.postId;
  const shareLink = result.data?.shareLink || `https://www.binance.com/square/post/${postId}`;
  console.log('✅ 发布成功, postId:', postId);
  console.log('🔗 帖子链接:', shareLink);
  
  // 尝试校验实际正文
  console.log('\n========== 尝试校验实际正文 ==========');
  const validation = await validateActualContent(postId);
  
  if (!validation.success) {
    console.log('⚠️ 自动校验失败:', validation.error);
    console.log('⚠️ 请手动访问帖子链接确认正文长度');
  } else {
    console.log('实际正文长度:', validation.length);
    console.log('实际正文前100字符:', validation.content?.substring(0, 100) || 'N/A');
    
    if (validation.length < 20) {
      throw new Error(`❌ 发布失败: 实际正文长度 ${validation.length} < 20`);
    }
    
    console.log('✅ 正文长度校验通过');
  }
  
  return postId;
}

/**
 * 尝试获取帖子实际内容
 * 尝试过的方案:
 * 1. /bapi/content/v1/public/pgc/circle/post/detail - 403 Forbidden
 * 2. /bapi/content/v1/pgc/circle/post/detail - 403 Forbidden  
 * 3. /bapi/composite/v1/public/pgc/circle/post/detail - 404 Not Found
 * 4. www.binance.com/square/post/{id} - 202 (需要JS渲染)
 * 5. app.binance.com/uni-qr/cpos/{id} - 202 (需要JS渲染)
 */
async function validateActualContent(postId) {
  // 尝试方案: 使用发布时返回的 content 进行校验
  // 由于 Binance API 没有提供查询接口，我们只能依赖发送前的校验
  
  // 如果未来 API 开放，可以在这里添加查询逻辑
  // 当前返回无法自动校验
  
  return {
    success: false,
    error: 'Binance API 未提供帖子详情查询接口，已尝试的方案全部失败',
    attempted: [
      '/bapi/content/v1/public/pgc/circle/post/detail - 403',
      '/bapi/content/v1/pgc/circle/post/detail - 403',
      '/bapi/composite/v1/public/pgc/circle/post/detail - 404',
      '/square/post/{id} - 202 (需JS渲染)',
      '/uni-qr/cpos/{id} - 202 (需JS渲染)'
    ]
  };
}

async function main() {
  console.log('📤 开始API发帖流程...');
  console.log('当前工作目录:', process.cwd());
  console.log('__filename:', __filename);
  if (process.env.DEBUG === 'true') { console.log('API_KEY 已读取'); }
  
  try {
    // 1. 校验 content
    validateContent(ARTICLE_CONTENT);
    
    // 2. 构造 payload
    const payload = buildPayload(ARTICLE_CONTENT);
    
    // 3. 内容质量检查（2026-03-10新增）
    validateContentQuality(ARTICLE_CONTENT);
    
    // 4. 发送请求
    console.log('\n========== 发送请求 ==========');
    const result = await postToBinanceAPI(payload);
    
    // 4. 校验结果
    const postId = await validatePostResult(result);
    
    console.log('\n========== 最终结果 ==========');
    console.log('🔗 帖子链接: https://www.binance.com/square/post/' + postId);
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
