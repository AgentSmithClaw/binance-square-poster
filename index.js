#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const SKILL_DIR = __dirname;
const NODE = process.execPath;

function runScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SKILL_DIR, 'scripts', scriptName);
    const child = spawn(NODE, [scriptPath, ...args], {
      cwd: SKILL_DIR,
      stdio: 'inherit'
    });

    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--help';

  try {
    switch (mode) {
      case '--fetch':
        await runScript('fetch-news.js');
        break;
      case '--summary':
        await runScript('generate-summary.js');
        break;
      case '--post':
        await runScript('post-to-binance.js');
        break;
      case '--full':
        await runScript('generate-article.js');
        break;
      case '--fetch-hot':
        await runScript('fetch-square-hot.js');
        break;
      case '--generate-hot':
      case '--generate-templates':
      case '--generate-variants':
        await runScript('generate-hot-post.js');
        break;
      case '--hot-full':
        await runScript('fetch-square-hot.js');
        await runScript('generate-hot-post.js');
        break;
      case '--list-hot-drafts':
        await runScript('select-hot-draft.js', ['--list']);
        break;
      case '--select-hot-primary':
        await runScript('select-hot-draft.js', ['--primary']);
        break;
      case '--select-hot-template':
        if (!args[1]) throw new Error('Usage: node index.js --select-hot-template contrarian-alert');
        await runScript('select-hot-draft.js', ['--template', args[1]]);
        break;
      case '--select-hot-variant':
        if (!args[1] || !args[2]) throw new Error('Usage: node index.js --select-hot-variant ETH aggressive');
        await runScript('select-hot-draft.js', ['--variant', args[1], args[2]]);
        break;
      case '--schedule-show':
        await runScript('schedule-manager.js', ['--show']);
        break;
      case '--schedule-set':
        if (!args[1]) throw new Error('Usage: node index.js --schedule-set 09:00,12:00,20:30');
        await runScript('schedule-manager.js', ['--set', args[1]]);
        break;
      case '--schedule-timezone':
        if (!args[1]) throw new Error('Usage: node index.js --schedule-timezone Asia/Shanghai');
        await runScript('schedule-manager.js', ['--timezone', args[1]]);
        break;
      case '--schedule-pipeline':
        if (!args[1]) throw new Error('Usage: node index.js --schedule-pipeline daily-report|hot-post|mixed');
        await runScript('schedule-manager.js', ['--pipeline', args[1]]);
        break;
      case '--scheduler-enable':
        await runScript('schedule-manager.js', ['--enable']);
        break;
      case '--scheduler-disable':
        await runScript('schedule-manager.js', ['--disable']);
        break;
      case '--scheduler':
        await runScript('scheduler.js');
        break;
      default:
        console.log(`
Usage:
  node index.js --fetch
  node index.js --summary
  node index.js --post
  node index.js --full
  node index.js --fetch-hot
  node index.js --generate-hot
  node index.js --hot-full
  node index.js --list-hot-drafts
  node index.js --select-hot-primary
  node index.js --select-hot-template contrarian-alert
  node index.js --select-hot-variant ETH aggressive
  node index.js --schedule-show
  node index.js --schedule-set 09:00,12:00,20:30
  node index.js --schedule-timezone Asia/Shanghai
  node index.js --schedule-pipeline daily-report|hot-post|mixed
  node index.js --scheduler-enable
  node index.js --scheduler-disable
  node index.js --scheduler
`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();