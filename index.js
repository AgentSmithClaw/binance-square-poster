#!/usr/bin/env node

/**
 * 加密货币资讯自动化主脚本
 * 整合抓取、摘要、发帖功能
 */

const { spawn } = require('child_process');
const path = require('path');

const SKILL_DIR = path.join(__dirname);

// 运行子脚本
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SKILL_DIR, 'scripts', scriptName);
    const child = spawn('node', [scriptPath], {
      cwd: SKILL_DIR,
      stdio: 'inherit'
    });
    
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`脚本退出码: ${code}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--help';
  
  console.log('🦞 加密货币资讯自动化系统\n');
  
  try {
    switch (mode) {
      case '--fetch':
        console.log('📡 模式: 抓取资讯');
        await runScript('fetch-news.js');
        break;
        
      case '--summary':
        console.log('🧠 模式: 生成摘要');
        await runScript('generate-summary.js');
        break;
        
      case '--post':
        console.log('📤 模式: 发布内容');
        await runScript('post-to-binance.js');
        break;
        
      case '--full':
        console.log('🚀 模式: 完整流程 (抓取+摘要+审核+发布)');
        console.log('\n步骤 1/2: 抓取资讯...');
        await runScript('fetch-news.js');
        
        console.log('\n步骤 2/2: 生成摘要...');
        await runScript('generate-summary.js');
        
        console.log('\n⏳ 请审核内容后回复"确认发布"');
        break;
        
      default:
        console.log(`
用法:
  node index.js --fetch      # 只抓取资讯
  node index.js --summary    # 只生成摘要
  node index.js --post       # 只发布内容
  node index.js --full       # 完整流程
  
定时任务配置:
  openclaw cron add "0 9,20 * * *" "crypto-news-automation --full"
`);
    }
  } catch (e) {
    console.error('❌ 错误:', e.message);
    process.exit(1);
  }
}

main();
