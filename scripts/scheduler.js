#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');
const { DATA_DIR, loadConfig, readJsonIfExists, writeJson } = require('./config-utils');

const STATE_PATH = path.join(DATA_DIR, 'schedule-state.json');

function nowInTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(part => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    second: parts.second
  };
}

function loadState() {
  return readJsonIfExists(STATE_PATH, { runs: {} });
}

function saveState(state) {
  writeJson(STATE_PATH, state);
}

function markRun(slotKey) {
  const state = loadState();
  state.runs[slotKey] = new Date().toISOString();
  saveState(state);
}

function hasRun(slotKey) {
  const state = loadState();
  return Boolean(state.runs[slotKey]);
}

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, scriptName)], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });

    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function executePipeline(pipeline, autoPost) {
  if (pipeline === 'daily-report') {
    await runScript('generate-article.js');
    if (autoPost) await runScript('post-to-binance.js');
    return;
  }

  if (pipeline === 'hot-post') {
    await runScript('fetch-square-hot.js');
    await runScript('generate-hot-post.js');
    if (autoPost) await runScript('post-to-binance.js');
    return;
  }

  if (pipeline === 'mixed') {
    await runScript('generate-article.js');
    await runScript('fetch-square-hot.js');
    await runScript('generate-hot-post.js');
    if (autoPost) await runScript('post-to-binance.js');
    return;
  }

  throw new Error(`Unsupported pipeline: ${pipeline}`);
}

async function main() {
  const config = loadConfig();
  const scheduler = config.publish?.scheduler || {};
  const schedule = config.publish?.schedule || [];
  const timeZone = config.publish?.timezone || 'Asia/Shanghai';
  const intervalMs = Math.max(15, Number(scheduler.pollIntervalSeconds || 30)) * 1000;

  if (!scheduler.enabled) {
    console.log('Scheduler is disabled. Enable it with schedule-manager.js --enable');
    return;
  }

  if (!schedule.length) {
    throw new Error('No schedule times configured.');
  }

  console.log(`Scheduler started for ${timeZone}`);
  console.log(`Times: ${schedule.join(', ')}`);
  console.log(`Pipeline: ${scheduler.pipeline}`);

  const tick = async () => {
    const current = nowInTimeZone(timeZone);
    const slotKey = `${current.date} ${current.time}`;
    if (!schedule.includes(current.time)) {
      return;
    }
    if (hasRun(slotKey)) {
      return;
    }

    console.log(`Running scheduled slot ${slotKey}`);
    markRun(slotKey);
    try {
      await executePipeline(scheduler.pipeline || 'daily-report', Boolean(scheduler.autoPost));
    } catch (error) {
      console.error(`Scheduled run failed for ${slotKey}: ${error.message}`);
    }
  };

  if (scheduler.runOnStart) {
    await executePipeline(scheduler.pipeline || 'daily-report', Boolean(scheduler.autoPost));
  }

  await tick();
  setInterval(() => {
    tick().catch(error => {
      console.error('Scheduler loop error:', error.message);
    });
  }, intervalMs);
}

main().catch(error => {
  console.error('Scheduler error:', error.message);
  process.exit(1);
});
