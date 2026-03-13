---
name: binance-square-poster
description: Generate Binance Square crypto drafts, scrape Binance Square hot posts, create viral-style template drafts, produce multi-style coin copy, manage scheduled posting workflows, and preview selected drafts for publishing. Use this skill when the user wants to turn crypto news or Binance Square trends into post drafts, configure timed runs, select a draft for publishing, or preview/post to Binance Square.
---

# Binance Square Poster

Use this skill for Binance Square content workflows that combine news collection, hot-post scraping, copy generation, scheduling, and publish preview.

## Use This Skill When

The user wants to:

- generate a Binance Square daily draft from crypto news
- scrape Binance Square hot posts into structured data
- generate a main hot-post draft from current Square trends
- create viral-style structure templates without copying source posts verbatim
- generate multiple coin-specific variants for hot symbols
- choose a generated draft and move it into publish-preview flow
- set, inspect, enable, or run a posting schedule

## Core Entry Points

- `node index.js --full`
  Daily crypto draft pipeline
- `node index.js --fetch-hot`
  Scrape Binance Square hot posts into `data/hot-posts.json`
- `node index.js --generate-hot`
  Generate `primaryPost`, `viralTemplates`, and `coinVariants`
- `node index.js --hot-full`
  Run hot-post scraping and generation in one pass
- `node index.js --list-hot-drafts`
  List selectable generated drafts
- `node index.js --select-hot-primary`
  Select the main generated hot-post draft
- `node index.js --select-hot-template contrarian-alert`
  Select a template draft
- `node index.js --select-hot-variant BTC aggressive`
  Select a symbol/style draft
- `node index.js --post`
  Open publish preview using the latest selected draft if available

## Main Files

- `index.js`: unified CLI entry
- `scripts/fetch-news.js`: news collection
- `scripts/generate-summary.js`: summary generation
- `scripts/generate-article.js`: daily draft generation
- `scripts/fetch-square-hot.js`: Playwright-based Square scraping and scoring
- `scripts/generate-hot-post.js`: main draft, template, and coin variant generation
- `scripts/select-hot-draft.js`: move a selected generated draft into pending state
- `scripts/post-to-binance.js`: publish preview flow
- `scripts/schedule-manager.js`: schedule configuration
- `scripts/scheduler.js`: long-running scheduler
- `scripts/state-manager.js`: pending draft state and status tracking
- `config/config.json`: runtime configuration

## Output Shape

Hot-post generation writes `data/generated-hot-post.json` with:

- `primaryPost`: summary-style main draft
- `viralTemplates`: structure-driven reusable drafts
- `coinVariants`: symbol groups with style variants

Current template families:

- `contrarian-alert`
- `checklist-breakdown`
- `momentum-question`

Current style variants:

- `steady`
- `aggressive`
- `debate`
- `educational`

## Scheduling Commands

- `node index.js --schedule-show`
- `node index.js --schedule-set 09:00,12:00,20:30`
- `node index.js --schedule-timezone Asia/Shanghai`
- `node index.js --schedule-pipeline daily-report|hot-post|mixed`
- `node index.js --scheduler-enable`
- `node index.js --scheduler-disable`
- `node index.js --scheduler`

## Working Rules

- Use scraped hot posts as signal sources for topic, structure, and sentiment, not as text to copy.
- Prefer generated draft selection before publish preview so the latest chosen content is explicit.
- Treat hot-post rankings and quality scores as heuristics.
- If publish preview fails, distinguish between invalid login state, Playwright issues, and Binance page-structure changes.
- Do not expose API keys, cookies, or saved login state in output.
- Keep `reviewBeforePost` enabled unless the user explicitly asks for full automation.
