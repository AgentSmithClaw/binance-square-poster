const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'config', 'config.json');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const DEFAULT_CONFIG = {
  sources: [],
  publish: {
    platform: 'binance-square',
    apiKey: 'YOUR_BINANCE_SQUARE_API_KEY',
    minNews: 5,
    reviewBeforePost: true,
    schedule: ['09:00', '12:00', '15:00', '18:00', '20:00', '23:00'],
    timezone: 'Asia/Shanghai',
    scheduler: {
      enabled: false,
      pipeline: 'daily-report',
      autoPost: false,
      runOnStart: false,
      pollIntervalSeconds: 30
    }
  },
  square: {
    hotFeed: {
      enabled: true,
      url: 'https://www.binance.com/zh-CN/square',
      maxCards: 20,
      maxPosts: 8,
      scrollRounds: 3,
      headless: true,
      useSavedLoginState: true
    }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeObjects(base, extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) {
    return base;
  }

  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (Array.isArray(value)) {
      output[key] = [...value];
      continue;
    }
    if (value && typeof value === 'object') {
      const current = output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])
        ? output[key]
        : {};
      output[key] = mergeObjects(current, value);
      continue;
    }
    output[key] = value;
  }
  return output;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadConfig() {
  const defaults = clone(DEFAULT_CONFIG);
  if (!fs.existsSync(CONFIG_PATH)) {
    return defaults;
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return mergeObjects(defaults, parsed);
}

function saveConfig(config) {
  const normalized = mergeObjects(clone(DEFAULT_CONFIG), config || {});
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(normalized, null, 2)}\n`);
}

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDataDir();
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  CONFIG_PATH,
  DEFAULT_CONFIG,
  ensureDataDir,
  loadConfig,
  saveConfig,
  readJsonIfExists,
  writeJson
};
