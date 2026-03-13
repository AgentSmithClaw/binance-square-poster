#!/usr/bin/env node

const { loadConfig, saveConfig } = require('./config-utils');

function normalizeTimes(rawValue) {
  const values = String(rawValue || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (!values.length) {
    throw new Error('Provide at least one time value, for example 09:00,12:00,20:30');
  }

  const unique = Array.from(new Set(values.map(value => {
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new Error(`Invalid time: ${value}`);
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) {
      throw new Error(`Invalid time: ${value}`);
    }
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  })));

  return unique.sort();
}

function printConfig(config) {
  const schedule = config.publish?.schedule || [];
  const scheduler = config.publish?.scheduler || {};
  const timezone = config.publish?.timezone || 'Asia/Shanghai';
  console.log(`Timezone: ${timezone}`);
  console.log(`Schedule: ${schedule.join(', ') || '(empty)'}`);
  console.log(`Scheduler enabled: ${scheduler.enabled ? 'yes' : 'no'}`);
  console.log(`Pipeline: ${scheduler.pipeline || 'daily-report'}`);
  console.log(`Auto post: ${scheduler.autoPost ? 'yes' : 'no'}`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--show';
  const config = loadConfig();

  if (command === '--show') {
    printConfig(config);
    return;
  }

  if (command === '--set') {
    config.publish.schedule = normalizeTimes(args[1]);
    saveConfig(config);
    printConfig(config);
    return;
  }

  if (command === '--timezone') {
    const timezone = args[1];
    if (!timezone) {
      throw new Error('Provide a timezone, for example Asia/Shanghai');
    }
    config.publish.timezone = timezone;
    saveConfig(config);
    printConfig(config);
    return;
  }

  if (command === '--pipeline') {
    const pipeline = args[1];
    const allowed = new Set(['daily-report', 'hot-post', 'mixed']);
    if (!allowed.has(pipeline)) {
      throw new Error('Pipeline must be one of: daily-report, hot-post, mixed');
    }
    config.publish.scheduler.pipeline = pipeline;
    saveConfig(config);
    printConfig(config);
    return;
  }

  if (command === '--enable' || command === '--disable') {
    config.publish.scheduler.enabled = command === '--enable';
    saveConfig(config);
    printConfig(config);
    return;
  }

  if (command === '--auto-post') {
    const value = String(args[1] || '').toLowerCase();
    if (!['true', 'false'].includes(value)) {
      throw new Error('Auto post value must be true or false');
    }
    config.publish.scheduler.autoPost = value === 'true';
    saveConfig(config);
    printConfig(config);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  console.error('Schedule manager error:', error.message);
  process.exit(1);
}
