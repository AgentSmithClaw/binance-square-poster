#!/usr/bin/env node

const { chromium } = require('playwright');
const path = require('path');

async function saveLoginState() {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('🌐 打开币安广场...');
  await page.goto('https://www.binance.com/zh-CN/square', { 
    waitUntil: 'networkidle', 
    timeout: 30000 
  });
  
  console.log('⚠️ 请手动登录...');
  console.log('⏳ 登录成功后，请在此窗口输入"已登录"并回车');
  
  // 等待用户输入
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  await new Promise(resolve => {
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
  
  // 保存登录状态
  const statePath = path.join(__dirname, '../data/binance-state.json');
  await context.storageState({ path: statePath });
  
  console.log('✅ 登录状态已保存到:', statePath);
  
  await browser.close();
}

saveLoginState().catch(console.error);
