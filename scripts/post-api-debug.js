#!/usr/bin/env node

/**
 * 币安广场API发帖脚本 - 调试版本
 * 用于真实请求验证
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.BINANCE_SQUARE_OPENAPI_KEY;
if (!API_KEY) {
  console.error('❌ 错误: 未设置环境变量 BINANCE_SQUARE_OPENAPI_KEY');
  process.exit(1);
}

// 唯一标记
const RUN_MARKER = `post_api_debug_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;

console.log('\n========== 执行标记 ==========');
console.log('RUN_MARKER:', RUN_MARKER);
console.log('process.pid:', process.pid);
console.log('process.cwd():', process.cwd());
console.log('__filename:', __filename);
console.log('__dirname:', __dirname);
console.log('Date.now():', Date.now());

const TEMP_FILE = '/tmp/binance-post-body.json';

async function testPost(testName, payload) {
  console.log(`\n========== 测试 ${testName} ==========`);
  
  const rawBody = JSON.stringify(payload);
  console.log('RAW_HTTP_BODY=', rawBody);
  console.log('RAW_HTTP_BODY_LENGTH=', rawBody.length);
  
  // 写入临时文件
  fs.writeFileSync(TEMP_FILE, rawBody);
  console.log('已写入临时文件:', TEMP_FILE);
  console.log('临时文件内容:', fs.readFileSync(TEMP_FILE, 'utf-8'));
  
  const url = 'https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add';
  
  console.log('\n========== 发送请求 ==========');
  console.log('URL:', url);
  console.log('Method: POST');
  console.log('Headers:', {
    'Content-Type': 'application/json',
    'X-Square-OpenAPI-Key': API_KEY.substring(0, 10) + '...',
    'clienttype': 'binanceSkill'
  });
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Square-OpenAPI-Key': API_KEY,
        'clienttype': 'binanceSkill'
      },
      body: rawBody,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('\n========== 响应信息 ==========');
    console.log('response.status:', response.status);
    console.log('response.statusText:', response.statusText);
    console.log('response.headers:');
    for (const [key, value] of response.headers) {
      console.log(`  ${key}: ${value}`);
    }
    
    const responseText = await response.text();
    console.log('原始 response text:', responseText);
    
    const data = JSON.parse(responseText);
    console.log('解析后的 JSON:', JSON.stringify(data, null, 2));
    
    const postId = data.data?.id || data.data?.postId;
    const shareLink = postId ? `https://www.binance.com/square/post/${postId}` : null;
    
    console.log('\n========== 结果 ==========');
    console.log('postId:', postId);
    console.log('帖子链接:', shareLink);
    console.log('success:', data.success);
    
    return {
      testName,
      rawBody,
      rawBodyLength: rawBody.length,
      responseStatus: response.status,
      responseText,
      data,
      postId,
      shareLink
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('请求错误:', error.message);
    return {
      testName,
      rawBody,
      error: error.message
    };
  }
}

async function main() {
  console.log('\n========== 开始测试 ==========');
  
  // 测试 A: { bodyTextOnly: true }
  const resultA = await testPost('A', { bodyTextOnly: true });
  
  // 测试 B: 简单文本
  const resultB = await testPost('B', { 
    content: "HELLO_TEST_123", 
    bodyTextOnly: true, 
    msgType: "post" 
  });
  
  // 测试 C: 多行文本
  const resultC = await testPost('C', { 
    content: "FIRST_LINE\nSECOND_LINE\nTHIRD_LINE", 
    bodyTextOnly: true, 
    msgType: "post" 
  });
  
  console.log('\n========== 测试汇总 ==========');
  console.log('A. bodyTextOnly=true -> postId:', resultA.postId || '失败');
  console.log('B. HELLO_TEST_123 -> postId:', resultB.postId || '失败');
  console.log('C. 多行文本 -> postId:', resultC.postId || '失败');
}

main();
