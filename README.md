# Binance Square Poster

一个面向 Binance Square 的内容自动化项目，支持从加密资讯生成日报、抓取 Binance Square 热门帖子、生成仿爆款结构模板、按币种产出多风格文案，并通过定时任务驱动整条内容流水线。

## 当前能力

- 抓取多源加密资讯并生成日报草稿
- 从 Binance Square 抓取热门帖子并提炼热点
- 生成主帖成稿、仿爆款模板、按币种多版本文案
- 支持 `steady`、`aggressive`、`debate`、`educational` 四种文案风格
- 支持草稿选择、待发布状态管理、发布预览
- 支持配置定时任务，自动执行日报或热帖流水线

## 项目结构

```text
binance-square-poster/
|- SKILL.md
|- README.md
|- CHECKLIST.md
|- NOTES.md
|- index.js
|- config/
|  |- config.example.json
|  |- config.json
|- data/
|  |- .gitkeep
|- scripts/
|  |- fetch-news.js
|  |- generate-summary.js
|  |- generate-article.js
|  |- fetch-square-hot.js
|  |- generate-hot-post.js
|  |- select-hot-draft.js
|  |- post-to-binance.js
|  |- schedule-manager.js
|  |- scheduler.js
|  |- state-manager.js
|- state/
```

## 环境要求

- Node.js 18+
- npm
- Playwright
- 可用的 Binance 登录态，用于抓取或发布预览

安装依赖：

```bash
npm install
npx playwright install chromium
```

## 快速开始

### 1. 安装并准备配置

```bash
cp config/config.example.json config/config.json
```

默认主要配置在 [config/config.example.json](E:/codex/binance-square-poster-main/config/config.example.json)：

- `publish.schedule`：定时执行时间
- `publish.timezone`：时区
- `publish.scheduler`：调度器开关与执行模式
- `square.hotFeed`：热帖抓取行为
- `square.hotGeneration`：热帖生成行为
- `square.symbolPool`：币种白名单 / 黑名单

### 2. 生成日报内容

```bash
node index.js --fetch
node index.js --summary
node index.js --full
```

说明：

- `--fetch` 抓资讯
- `--summary` 生成摘要
- `--full` 生成日报草稿

### 3. 抓取 Binance Square 热帖

```bash
node index.js --fetch-hot
```

输出文件：

- `data/hot-posts.json`

这个文件里会包含：

- 热帖标题或正文片段
- 提取出的币种
- 标签与关键词
- 热度和质量评分

### 4. 生成热帖内容

```bash
node index.js --generate-hot
```

也可以直接跑整条热帖流水线：

```bash
node index.js --hot-full
```

输出文件：

- `data/generated-hot-post.json`

生成结果包含三部分：

- `primaryPost`：主帖成稿
- `viralTemplates`：仿爆款结构模板
- `coinVariants`：按币种生成的多风格文案

## 仿爆款模板

当前会生成 3 类结构模板：

- `contrarian-alert`：反常识预警型
- `checklist-breakdown`：清单拆解型
- `momentum-question`：情绪带问号型

这些模板不会直接复制原帖，而是复用热帖常见的结构特征：

- 强钩子开头
- 明确币种焦点
- 明确观点判断
- 风险提醒
- 互动式结尾

## 币种多风格文案

当前每个热点币种会生成 4 套风格：

- `steady`：稳健型
- `aggressive`：激进型
- `debate`：争议型
- `educational`：科普型

如果你想把某一版文案选进待发布区，可以用：

```bash
node index.js --list-hot-drafts
node index.js --select-hot-primary
node index.js --select-hot-template contrarian-alert
node index.js --select-hot-variant BNB aggressive
```

## 发布预览

```bash
node index.js --post
```

当前发布逻辑会：

- 优先读取最新选中的热帖草稿
- 如果没有 pending 草稿，再回退到旧的 `today-summary.json`
- 打开 Binance Square 页面并尝试进入发布预览

注意：

- 要想真正进入发布预览，`data/binance-state.json` 需要是有效登录态
- 如果登录态失效，脚本会打开页面但无法进入发布框

## 定时任务

查看当前调度配置：

```bash
node index.js --schedule-show
```

设置执行时间：

```bash
node index.js --schedule-set 09:00,12:00,20:30
```

设置时区：

```bash
node index.js --schedule-timezone Asia/Shanghai
```

设置执行管线：

```bash
node index.js --schedule-pipeline daily-report
node index.js --schedule-pipeline hot-post
node index.js --schedule-pipeline mixed
```

启用或关闭调度：

```bash
node index.js --scheduler-enable
node index.js --scheduler-disable
```

启动调度器进程：

```bash
node index.js --scheduler
```

## 主要脚本说明

- `index.js`：统一入口
- `scripts/fetch-news.js`：资讯抓取
- `scripts/generate-summary.js`：摘要生成
- `scripts/generate-article.js`：日报草稿生成
- `scripts/fetch-square-hot.js`：热帖抓取与过滤
- `scripts/generate-hot-post.js`：热帖主帖、模板、币种文案生成
- `scripts/select-hot-draft.js`：选择待发布草稿
- `scripts/post-to-binance.js`：发布预览
- `scripts/schedule-manager.js`：调度配置管理
- `scripts/scheduler.js`：定时执行器
- `scripts/state-manager.js`：待发布状态管理

## 当前已实现但要注意的点

- 热帖质量依赖 Binance Square 实时内容，榜单会随时间变化
- 登录态文件不会提交到仓库，需要你本地自行生成
- `data/` 下的大部分内容是本地运行产物，默认不提交 Git
- 发布链路当前以“打开预览、人工确认”为主，不建议盲目自动发布

## 推荐流程

如果你想每天跑一轮热点内容，推荐使用这条流程：

```bash
node index.js --fetch-hot
node index.js --generate-hot
node index.js --list-hot-drafts
node index.js --select-hot-variant BNB aggressive
node index.js --post
```

如果你想让它自动定时跑，推荐先这样配置：

```bash
node index.js --schedule-set 09:00,12:00,20:30
node index.js --schedule-pipeline hot-post
node index.js --scheduler-enable
node index.js --scheduler
```
