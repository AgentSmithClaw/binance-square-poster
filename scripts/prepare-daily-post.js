#!/usr/bin/env node

const fs = require('fs');
const { buildDailyReport } = require('./build-daily-report');
const { validateDailyReport } = require('./validate-daily-report');

function prepareDailyPost(input) {
  const report = buildDailyReport(input);
  const validation = validateDailyReport({ ...input, report });
  if (!validation.ok) {
    const err = new Error('日报校验失败');
    err.issues = validation.issues;
    throw err;
  }
  return { report, validation };
}

module.exports = { prepareDailyPost };

if (require.main === module) {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  const result = prepareDailyPost(input);
  process.stdout.write(result.report);
}
