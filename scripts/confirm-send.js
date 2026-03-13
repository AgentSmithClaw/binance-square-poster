#!/usr/bin/env node

/**
 * 纭鍙戦€佽剼鏈? * 璇诲彇 pendingPost锛屽彂閫佸埌 Binance锛屾竻绌虹姸鎬? */

const fs = require('fs');
const path = require('path');
const stateManager = require('./state-manager');
const { spawn } = require('child_process');

const GROUP_ID = 'oc_f0540e704bf850b75fb04c3ecbe4adea';
const THREAD_ID = 'default';

async function main() {
  console.log('馃搵 妫€鏌ュ緟鍙戦€佽崏绋?..');
  
  // 1. 璇诲彇 pendingPost
  const pending = stateManager.getPendingPost(GROUP_ID, THREAD_ID);
  
  if (!pending || !pending.postContent) {
    console.log('鉂?褰撳墠娌℃湁寰呭彂閫佽崏绋?);
    process.exit(1);
  }
  
  console.log('鉁?鎵惧埌寰呭彂閫佽崏绋匡紝姝ｆ枃闀垮害:', pending.postContent.length);
  
  // 2. 璋冪敤 post-api.js 鍙戦€?  const postContent = pending.postContent;
  
  console.log('馃殌 姝ｅ湪鍙戦€佸埌 Binance Square...');
  
  return new Promise((resolve, reject) => {
    const apiScript = path.join(__dirname, 'post-api.js');
    const child = spawn(process.execPath, [apiScript], {
      env: { ...process.env, POST_CONTENT: postContent },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('鉁?鍙戝竷鎴愬姛');
        console.log(stdout);
        
        // 3. 娓呯┖鐘舵€侊紝璁句负 sent
        stateManager.updateStatus(GROUP_ID, THREAD_ID, 'sent');
        stateManager.clearPendingPost(GROUP_ID, THREAD_ID);
        console.log('鉁?鐘舵€佸凡鏇存柊: sent');
        
        resolve(stdout);
      } else {
        console.error('鉂?鍙戝竷澶辫触:', stderr);
        reject(new Error(stderr));
      }
    });
  });
}

main().catch(err => {
  console.error('閿欒:', err.message);
  process.exit(1);
});

