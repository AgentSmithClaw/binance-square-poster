#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function postWithBrowser() {
  console.log('启动浏览器...');
  
  const browser = await chromium.launch({
    headless: false,
    userDataDir: '/home/baiyuxi/.openclaw/browser/openclaw/user-data'
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 打开币安广场
  console.log('打开币安广场...');
  await page.goto('https://www.binance.com/zh-CN/square', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  
  // 等待页面加载
  await page.waitForTimeout(3000);
  
  // 检查是否已登录
  const loginBtn = await page.$('text="登录"');
  if (loginBtn) {
    console.log('⚠️ 未登录，请手动登录后告诉我');
    await loginBtn.click();
    await page.waitForTimeout(10000);
  } else {
    console.log('✅ 已登录');
  }
  
  // 点击发帖按钮
  console.log('点击发帖按钮...');
  const postButtons = await page.$$('button');
  
  for (const btn of postButtons) {
    const text = await btn.textContent();
    if (text && text.includes('发布')) {
      await btn.click();
      break;
    }
  }
  
  await page.waitForTimeout(2000);
  
  // 读取待发布内容
  const contentPath = path.join(__dirname, '../data/pending-post.txt');
  const content = fs.readFileSync(contentPath, 'utf-8');
  
  // 找到文本输入框
  console.log('输入内容...');
  const textarea = await page.$('textarea');
  if (textarea) {
    await textarea.fill(content);
  } else {
    // 尝试 contenteditable
    const editor = await page.$('[contenteditable="true"]');
    if (editor) {
      await editor.fill(content);
    }
  }
  
  console.log('✅ 内容已填入，请确认后点击发布按钮');
  console.log('发布完成后告诉我帖子链接');
  
  // 不关闭浏览器，等待用户操作
  await page.waitForTimeout(60000);
  
  await browser.close();
}

postWithBrowser().catch(console.error);
