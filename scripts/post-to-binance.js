#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const stateManager = require('./state-manager');
const { DATA_DIR, readJsonIfExists } = require('./config-utils');

const DEFAULT_GROUP_ID = 'oc_f0540e704bf850b75fb04c3ecbe4adea';
const STORAGE_STATE_PATH = path.join(DATA_DIR, 'binance-state.json');
const LEGACY_SUMMARY_PATH = path.join(DATA_DIR, 'today-summary.json');
const PREVIEW_PATH = path.join(DATA_DIR, 'preview.png');

function resolveDraftSource() {
  const latestHotDraft = stateManager.getLatestPendingPost(DEFAULT_GROUP_ID, { threadPrefix: 'hot-' });
  if (latestHotDraft?.postContent) {
    return {
      content: latestHotDraft.postContent,
      threadId: latestHotDraft.threadId,
      source: 'pending-draft',
      label: latestHotDraft.pendingCheck || latestHotDraft.threadId
    };
  }

  const legacySummary = readJsonIfExists(LEGACY_SUMMARY_PATH);
  if (legacySummary?.content) {
    return {
      content: legacySummary.content,
      threadId: 'legacy-summary',
      source: 'today-summary.json',
      label: legacySummary.title || 'Legacy summary'
    };
  }

  throw new Error('No publishable content found. Select a hot draft or generate today-summary.json first.');
}

async function ensureLoggedIn(page) {
  const loginButton = page.locator('text=登录').first();
  if (await loginButton.isVisible().catch(() => false)) {
    console.log('Detected logged-out state. Please complete login in the opened browser window.');
    await loginButton.click().catch(() => {});
    await page.waitForTimeout(15000);
  }

  if (await loginButton.isVisible().catch(() => false)) {
    throw new Error('Binance Square is still logged out. Please refresh your login state and try again.');
  }
}

async function openComposer(page) {
  const candidates = [
    page.locator('text=发布').first(),
    page.locator('button:has-text("发布")').first(),
    page.locator('a:has-text("发布")').first()
  ];

  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      await page.waitForTimeout(2000);
      return;
    }
  }

  throw new Error('Unable to find the publish button on Binance Square.');
}

async function fillComposer(page, content) {
  const selectors = [
    'textarea',
    '[contenteditable="true"]',
    'div[role="textbox"]'
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      try {
        await locator.click();
        await locator.fill(content);
      } catch (_) {
        await locator.click();
        await page.keyboard.press('Control+A').catch(() => {});
        await page.keyboard.type(content, { delay: 5 });
      }
      return selector;
    }
  }

  throw new Error('Unable to locate a writable composer field.');
}

async function postToBinance(content, options = {}) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const contextOptions = {};
  if (fs.existsSync(STORAGE_STATE_PATH)) {
    contextOptions.storageState = STORAGE_STATE_PATH;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    console.log('Opening Binance Square...');
    await page.goto('https://www.binance.com/zh-CN/square', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await ensureLoggedIn(page);
    await openComposer(page);
    const selectorUsed = await fillComposer(page, content);
    await page.screenshot({ path: PREVIEW_PATH, fullPage: true });

    console.log(`Draft loaded into composer with selector: ${selectorUsed}`);
    console.log(`Preview saved to: ${PREVIEW_PATH}`);

    if (options.threadId) {
      stateManager.updateStatus(DEFAULT_GROUP_ID, options.threadId, 'preview_ready');
    }

    return {
      success: true,
      previewPath: PREVIEW_PATH,
      browser,
      context,
      page
    };
  } catch (error) {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    return {
      success: false,
      error: error.message
    };
  }
}

async function confirmAndPost(page, options = {}) {
  const submitCandidates = [
    page.locator('button:has-text("发布")').last(),
    page.locator('text=确认').first(),
    page.locator('text=发布').last()
  ];

  for (const locator of submitCandidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      await page.waitForTimeout(3000);
      if (options.threadId) {
        stateManager.updateStatus(DEFAULT_GROUP_ID, options.threadId, 'posted');
      }
      return { success: true, url: page.url() };
    }
  }

  return { success: false, error: 'Submit button not found.' };
}

async function main() {
  const draft = resolveDraftSource();

  console.log(`Publishing source: ${draft.source}`);
  console.log(`Draft label: ${draft.label}`);
  console.log(`Draft thread: ${draft.threadId}`);

  const result = await postToBinance(draft.content, { threadId: draft.threadId });
  if (!result.success) {
    console.error(`Post preview failed: ${result.error}`);
    process.exit(1);
  }

  console.log('Preview is ready in the opened browser window. Review it manually before posting.');
  console.log(`Preview screenshot: ${PREVIEW_PATH}`);
}

module.exports = {
  resolveDraftSource,
  postToBinance,
  confirmAndPost
};

if (require.main === module) {
  main().catch(error => {
    console.error('Post flow failed:', error.message);
    process.exit(1);
  });
}
