#!/usr/bin/env node

/**
 * 确认发送脚本
 * 读取 pendingPost，发送到 Binance，清空状态
 */

const fs = require('fs');
const path = require('path');
const stateManager = require('./state-manager');
const { spawn } = require('child_process');

const GROUP_ID = 'oc_f0540e704bf850b75fb04c3ecbe4adea';
const THREAD_ID = 'default';

async function main() {
  console.log('📋 检查待发送草稿...');
  
  // 1. 读取 pendingPost
  const pending = stateManager.getPendingPost(GROUP_ID, THREAD_ID);
  
  if (!pending || !pending.postContent) {
    console.log('❌ 当前没有待发送草稿');
    process.exit(1);
  }
  
  console.log('✅ 找到待发送草稿，正文长度:', pending.postContent.length);
  
  // 2. 调用 post-api.js 发送
  const postContent = pending.postContent;
  
  console.log('🚀 正在发送到 Binance Square...');
  
  return new Promise((resolve, reject) => {
    const apiScript = path.join(__dirname, 'post-api.js');
    const child = spawn('node', [apiScript], {
      env: { ...process.env, POST_CONTENT: postContent },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 发布成功');
        console.log(stdout);
        
        // 3. 清空状态，设为 sent
        stateManager.updateStatus(GROUP_ID, THREAD_ID, 'sent');
        stateManager.clearPendingPost(GROUP_ID, THREAD_ID);
        console.log('✅ 状态已更新: sent');
        
        resolve(stdout);
      } else {
        console.error('❌ 发布失败:', stderr);
        reject(new Error(stderr));
      }
    });
  });
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
