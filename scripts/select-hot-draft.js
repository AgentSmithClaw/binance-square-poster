#!/usr/bin/env node

const path = require('path');
const stateManager = require('./state-manager');
const { DATA_DIR, readJsonIfExists } = require('./config-utils');

const GENERATED_PATH = path.join(DATA_DIR, 'generated-hot-post.json');
const DEFAULT_GROUP_ID = 'oc_f0540e704bf850b75fb04c3ecbe4adea';
const SELECTED_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

function usage() {
  console.log(`Usage:
  node scripts/select-hot-draft.js --primary
  node scripts/select-hot-draft.js --template contrarian-alert
  node scripts/select-hot-draft.js --variant ETH aggressive
  node scripts/select-hot-draft.js --list`);
}

function main() {
  const generated = readJsonIfExists(GENERATED_PATH);
  if (!generated) {
    throw new Error('generated-hot-post.json not found. Run --generate-hot first.');
  }

  const args = process.argv.slice(2);
  const command = args[0] || '--list';

  if (command === '--list') {
    console.log('Available templates:');
    for (const template of generated.viralTemplates || []) {
      console.log(`- ${template.templateId}: ${template.name}`);
    }
    console.log('\nAvailable variants:');
    for (const group of generated.coinVariants || []) {
      console.log(`- ${group.symbol}: ${group.variants.map(item => item.style).join(', ')}`);
    }
    return;
  }

  let content = '';
  let threadId = 'hot-post';
  let label = '热帖草稿已选择';

  if (command === '--primary') {
    content = generated.primaryPost?.content || '';
    threadId = 'hot-post-primary';
    label = '主帖草稿已选择';
  } else if (command === '--template') {
    const templateId = args[1];
    const template = (generated.viralTemplates || []).find(item => item.templateId === templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);
    content = template.content;
    threadId = `hot-template-${templateId}`;
    label = `模板草稿已选择: ${template.name}`;
  } else if (command === '--variant') {
    const symbol = String(args[1] || '').toUpperCase();
    const style = String(args[2] || '').toLowerCase();
    const group = (generated.coinVariants || []).find(item => item.symbol === symbol);
    if (!group) throw new Error(`Symbol variant group not found: ${symbol}`);
    const variant = (group.variants || []).find(item => item.style === style);
    if (!variant) throw new Error(`Variant style not found for ${symbol}: ${style}`);
    content = variant.content;
    threadId = `hot-variant-${symbol}-${style}`;
    label = `币种草稿已选择: ${symbol} ${style}`;
  } else {
    usage();
    throw new Error(`Unknown command: ${command}`);
  }

  if (!content) {
    throw new Error('Selected content is empty.');
  }

  stateManager.setPendingPost(DEFAULT_GROUP_ID, content, threadId, SELECTED_DRAFT_TTL_MS, label);
  console.log(content);
  console.log(`\nPending draft saved with thread id: ${threadId}`);
}

try {
  main();
} catch (error) {
  console.error('Select draft error:', error.message);
  process.exit(1);
}
