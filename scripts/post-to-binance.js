#!/usr/bin/env node

/**
 * 币安广场自动发帖脚本
 * 功能：登录并发布内容到币安广场
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function postToBinance(content) {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    storageState: path.join(__dirname, '../data/binance-state.json')
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🌐 打开币安广场...');
    await page.goto('https://www.binance.com/zh-CN/square', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    // 检查是否已登录
    const loginBtn = await page.$('text="登录"');
    if (loginBtn) {
      console.log('⚠️ 未登录，请先手动登录');
      await loginBtn.click();
      await page.waitForTimeout(10000); // 等待手动登录
    }
    
    console.log('✅ 已登录');
    
    // 点击发布按钮
    const postBtn = await page.$('text="发布"');
    if (!postBtn) {
      throw new Error('未找到发布按钮');
    }
    
    await postBtn.click();
    await page.waitForTimeout(2000);
    
    // 输入内容
    const textarea = await page.$('textarea');
    if (!textarea) {
      throw new Error('未找到输入框');
    }
    
    await textarea.fill(content);
    console.log(`📝 已输入内容 (${content.length} 字)`);
    
    // 截图预览
    await page.screenshot({ path: path.join(__dirname, '../data/preview.png') });
    console.log('📸 预览截图已保存');
    
    // 返回内容供审核
    return {
      success: true,
      content: content,
      previewPath: path.join(__dirname, '../data/preview.png')
    };
    
  } catch (e) {
    console.error('❌ 发帖失败:', e.message);
    return { success: false, error: e.message };
  } finally {
    // 不关闭浏览器，等待用户确认
  }
}

async function confirmAndPost(page, content) {
  try {
    // 点击确认发布
    const submitBtn = await page.$('text="确认"') || await page.$('text="发布"');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }
    
    // 获取帖子链接
    const url = page.url();
    
    console.log(`✅ 发布成功!`);
    console.log(`🔗 帖子链接: ${url}`);
    
    return { success: true, url };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function main() {
  const summaryPath = path.join(__dirname, '../data/today-summary.json');
  
  if (!fs.existsSync(summaryPath)) {
    console.error('❌ 没有摘要，请先运行 generate-summary.js');
    process.exit(1);
  }
  
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  
  console.log('📤 开始发帖流程...\n');
  const result = await postToBinance(summary.content);
  
  if (result.success) {
    console.log('\n⏳ 请确认内容后告诉我"确认发布"');
  }
}

module.exports = { postToBinance, confirmAndPost };

if (require.main === module) {
  main();
}
