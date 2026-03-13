---
name: binance-square-poster
description: Generate Binance Square crypto posts, scrape Binance Square hot posts, create viral-style hot-post templates, produce multi-version coin copy, and manage scheduled publishing workflows. Use this skill when the user wants to collect crypto news, turn Binance Square trends into draft posts, generate templated high-engagement variants, configure timed runs, or publish content to Binance Square.
---

# Binance Square Poster

This skill is for four related jobs:

1. Generate a daily Binance Square draft from crypto news and market data.
2. Scrape hot posts from Binance Square and turn them into a new hot-post draft.
3. Generate viral-style post templates based on current hot-post structure.
4. Generate multiple post variants for each hot coin symbol.

## When To Use

Use this skill when the user asks to:

- generate or publish a Binance Square post
- collect crypto news and build a daily post draft
- find hot posts on Binance Square
- scrape Binance Square content into structured data
- generate a post based on current Binance Square hot topics
- imitate high-performing post structure without copying raw text
- generate multiple variants for BTC, ETH, SOL, or other hot symbols
- set, view, or change timed tasks for the posting workflow

## Core Files

- `index.js`: unified entry point
- `scripts/fetch-news.js`: pull RSS news sources
- `scripts/generate-article.js`: create the daily crypto draft
- `scripts/fetch-square-hot.js`: scrape Binance Square hot-post cards with Playwright
- `scripts/generate-hot-post.js`: generate a main hot-post draft, viral templates, and symbol variants
- `scripts/schedule-manager.js`: set schedule, timezone, pipeline, and auto-post mode
- `scripts/scheduler.js`: long-running scheduler that executes jobs at configured times
- `scripts/post-to-binance.js`: publish a generated draft
- `config/config.json`: runtime configuration

## Fast Paths

### Daily crypto draft

```bash
node index.js --full
```

### Hot-post scrape plus template generation

```bash
node index.js --hot-full
```

This writes:

- `data/hot-posts.json`
- `data/generated-hot-post.json`

The generated output includes:

- `primaryPost`: the main summary draft
- `viralTemplates`: reusable high-engagement structure templates
- `coinVariants`: multiple versions for each hot coin symbol

### Only regenerate templates and coin variants

```bash
node index.js --generate-hot
node index.js --generate-templates
node index.js --generate-variants
```

All three commands currently run the same generator so the output stays synchronized.

## Viral-Style Templates

The generator creates template-style drafts based on the current hot-post signal mix, not by copying source posts.

Current template families:

- contrarian alert
- checklist breakdown
- momentum question

These are designed to mimic strong Binance Square post structure:

- fast hook
- specific symbol focus
- clear opinion
- risk reminder
- comment-driving ending

## Coin Variant Workflow

When the user wants copy for specific coins:

1. Scrape hot posts with `node index.js --fetch-hot`.
2. Generate outputs with `node index.js --generate-hot`.
3. Read `coinVariants` from `data/generated-hot-post.json`.
4. Pick the best symbol and style for publishing.

Variant styles currently included:

- short-punchy
- analysis-driven
- engagement-question

## Schedule Management

### View current schedule

```bash
node index.js --schedule-show
```

### Set schedule times

```bash
node index.js --schedule-set 09:00,12:00,20:30
```

### Set timezone

```bash
node index.js --schedule-timezone Asia/Shanghai
```

### Choose pipeline

```bash
node index.js --schedule-pipeline daily-report
node index.js --schedule-pipeline hot-post
node index.js --schedule-pipeline mixed
```

### Start scheduler process

```bash
node index.js --scheduler
```

## Config Notes

Read `config/config.json` only when runtime behavior must be changed.

Relevant hot-post generation fields:

```json
{
  "square": {
    "hotFeed": {
      "maxPosts": 8,
      "scrollRounds": 3
    },
    "hotGeneration": {
      "variantCountPerCoin": 3,
      "coinLimit": 3,
      "templateStyle": "viral-cn"
    }
  }
}
```

## Guardrails

- Never expose the full Binance API key in output.
- Prefer `reviewBeforePost=true` unless the user explicitly wants auto-posting.
- Treat scraped hot-post rankings as heuristic signals, not official engagement numbers.
- Use hot posts for structure and topic signals, not for verbatim copying.
- If scraping fails, report whether the blocker is login state, Playwright, or page-structure drift.
