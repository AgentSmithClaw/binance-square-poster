#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const stateManager = require('./state-manager');
const { DATA_DIR, readJsonIfExists, loadConfig, writeJson } = require('./config-utils');

const DEFAULT_GROUP_ID = 'oc_f0540e704bf850b75fb04c3ecbe4adea';
const STORAGE_STATE_PATH = path.join(DATA_DIR, 'binance-state.json');
const LEGACY_SUMMARY_PATH = path.join(DATA_DIR, 'today-summary.json');
const RELATED_IMAGES_PATH = path.join(DATA_DIR, 'related-images.json');
const POST_PACKAGE_PATH = path.join(DATA_DIR, 'post-package.json');
const PREVIEW_PATH = path.join(DATA_DIR, 'preview.png');

function extractSymbols(text) {
  return Array.from(new Set((String(text || '').match(/\$[A-Z0-9]{2,10}/g) || []).map(item => item.toUpperCase())));
}

function normalizeDraftContent(content) {
  return String(content || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveDraftSource() {
  const latestHotDraft = stateManager.getLatestPendingPost(DEFAULT_GROUP_ID, { threadPrefix: 'hot-' });
  if (latestHotDraft?.postContent) {
    return {
      content: normalizeDraftContent(latestHotDraft.postContent),
      threadId: latestHotDraft.threadId,
      source: 'pending-draft',
      label: latestHotDraft.pendingCheck || latestHotDraft.threadId
    };
  }

  const legacySummary = readJsonIfExists(LEGACY_SUMMARY_PATH);
  if (legacySummary?.content) {
    return {
      content: normalizeDraftContent(legacySummary.content),
      threadId: 'legacy-summary',
      source: 'today-summary.json',
      label: legacySummary.title || 'Legacy summary'
    };
  }

  throw new Error('No publishable content found. Select a hot draft or generate today-summary.json first.');
}

function resolveImageSelection(options = {}) {
  const explicitImages = Array.isArray(options.imagePaths)
    ? options.imagePaths.filter(filePath => fs.existsSync(filePath))
    : [];
  if (explicitImages.length) {
    return { source: 'explicit', images: explicitImages, matchedSymbols: [] };
  }

  const config = loadConfig();
  const imagesConfig = config.square?.images || {};
  if (imagesConfig.enabled === false || imagesConfig.attachOnPost === false) {
    return { source: 'disabled', images: [], matchedSymbols: [] };
  }

  const related = readJsonIfExists(RELATED_IMAGES_PATH);
  const selected = Array.isArray(related?.selected) ? related.selected : [];
  const draftSymbols = extractSymbols(options.content || '');

  const matching = selected.filter(item => draftSymbols.includes(String(item.symbol || '').toUpperCase()));
  const fallback = selected.filter(item => typeof item.filePath === 'string' && fs.existsSync(item.filePath));
  const limit = Number(imagesConfig.attachLimit || imagesConfig.maxDownloads || 1);
  const sourceItems = (matching.length ? matching : fallback)
    .filter(item => typeof item.filePath === 'string' && fs.existsSync(item.filePath))
    .slice(0, Math.max(1, limit));

  return {
    source: 'related-images.json',
    images: sourceItems.map(item => item.filePath),
    matchedSymbols: draftSymbols,
    candidates: sourceItems
  };
}

function writePostPackage(draft, imageSelection) {
  writeJson(POST_PACKAGE_PATH, {
    generatedAt: new Date().toISOString(),
    source: draft.source,
    label: draft.label,
    threadId: draft.threadId,
    content: draft.content,
    symbols: extractSymbols(draft.content),
    imageSource: imageSelection.source,
    images: imageSelection.images,
    matchedSymbols: imageSelection.matchedSymbols || []
  });
}

async function ensureLoggedIn(page) {
  const loginLocators = [
    page.locator('button:has-text("Login")').first(),
    page.locator('a:has-text("Login")').first(),
    page.locator('text=Login').first()
  ];

  for (const locator of loginLocators) {
    if (await locator.isVisible().catch(() => false)) {
      console.log('Detected logged-out state. Please complete login in the opened browser window.');
      await locator.click().catch(() => {});
      await page.waitForTimeout(15000);
      break;
    }
  }

  for (const locator of loginLocators) {
    if (await locator.isVisible().catch(() => false)) {
      throw new Error('Binance Square is still logged out. Please refresh your login state and try again.');
    }
  }
}

async function dismissCookieOverlays(page) {
  const candidates = [
    page.locator('button:has-text("Accept Cookies")').first(),
    page.locator('button:has-text("Allow All")').first(),
    page.locator('button:has-text("I Understand")').first(),
    page.locator('button:has-text("Accept")').first()
  ];

  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

async function openComposer(page) {
  const candidates = [
    page.locator('button:has-text("Post")').first(),
    page.locator('a:has-text("Post")').first(),
    page.locator('button:has-text("Create")').first(),
    page.locator('[data-bn-type="button"]').filter({ hasText: /Post|Create/i }).first(),
    page.locator('[role="button"]').filter({ hasText: /Post|Create/i }).first()
  ];

  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click().catch(() => {});
      await page.waitForTimeout(2500);
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

async function attachImages(page, imagePaths) {
  if (!imagePaths.length) {
    return { attached: [], method: 'skipped' };
  }

  const normalized = imagePaths.filter(filePath => fs.existsSync(filePath));
  if (!normalized.length) {
    return { attached: [], method: 'missing-files' };
  }

  let input = page.locator('input[type="file"]').first();
  const hasInput = async () => (await input.count()) > 0;

  if (!await hasInput()) {
    const triggers = [
      page.locator('button').filter({ hasText: /image|photo|upload|media/i }).first(),
      page.locator('label').filter({ hasText: /image|photo|upload|media/i }).first(),
      page.locator('[role="button"]').filter({ hasText: /image|photo|upload|media/i }).first(),
      page.locator('[aria-label*="image" i]').first(),
      page.locator('[aria-label*="upload" i]').first()
    ];

    for (const trigger of triggers) {
      if (await trigger.isVisible().catch(() => false)) {
        await trigger.click().catch(() => {});
        await page.waitForTimeout(1500);
        input = page.locator('input[type="file"]').first();
        if (await hasInput()) break;
      }
    }
  }

  if (!await hasInput()) {
    return { attached: [], method: 'input-not-found' };
  }

  await input.setInputFiles(normalized);
  await page.waitForTimeout(3000);
  return { attached: normalized, method: 'input[type=file]' };
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
  const normalizedContent = normalizeDraftContent(content);
  const imageSelection = resolveImageSelection({ ...options, content: normalizedContent });

  try {
    console.log('Opening Binance Square...');
    await page.goto('https://www.binance.com/en/square', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await dismissCookieOverlays(page);
    await ensureLoggedIn(page);
    await openComposer(page);
    const selectorUsed = await fillComposer(page, normalizedContent);
    const imageResult = await attachImages(page, imageSelection.images);
    await page.screenshot({ path: PREVIEW_PATH, fullPage: true });

    console.log(`Draft loaded into composer with selector: ${selectorUsed}`);
    console.log(`Preview saved to: ${PREVIEW_PATH}`);
    console.log(`Image source: ${imageSelection.source}`);
    console.log(`Matched symbols: ${(imageSelection.matchedSymbols || []).join(', ') || 'none'}`);
    console.log(`Image attach method: ${imageResult.method}`);
    console.log(`Attached images: ${imageResult.attached.length}`);

    if (options.threadId) {
      stateManager.updateStatus(DEFAULT_GROUP_ID, options.threadId, 'preview_ready');
    }

    return {
      success: true,
      previewPath: PREVIEW_PATH,
      browser,
      context,
      page,
      imageSelection,
      imageResult
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
    page.locator('button:has-text("Post")').last(),
    page.locator('button:has-text("Publish")').last(),
    page.locator('[data-bn-type="button"]').filter({ hasText: /Post|Publish/i }).last()
  ];

  for (const locator of submitCandidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click().catch(() => {});
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
  const imageSelection = resolveImageSelection({ content: draft.content });
  writePostPackage(draft, imageSelection);

  console.log(`Publishing source: ${draft.source}`);
  console.log(`Draft label: ${draft.label}`);
  console.log(`Draft thread: ${draft.threadId}`);
  console.log(`Post package: ${POST_PACKAGE_PATH}`);

  const result = await postToBinance(draft.content, { threadId: draft.threadId, imagePaths: imageSelection.images });
  if (!result.success) {
    console.error(`Post preview failed: ${result.error}`);
    process.exit(1);
  }

  console.log('Preview is ready in the opened browser window. Review it manually before posting.');
  console.log(`Preview screenshot: ${PREVIEW_PATH}`);
}

module.exports = {
  extractSymbols,
  normalizeDraftContent,
  resolveDraftSource,
  resolveImageSelection,
  writePostPackage,
  postToBinance,
  confirmAndPost
};

if (require.main === module) {
  main().catch(error => {
    console.error('Post flow failed:', error.message);
    process.exit(1);
  });
}
