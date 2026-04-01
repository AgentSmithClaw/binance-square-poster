# 🚀 binance-square-poster

<div align="center">

[![Runtime](https://img.shields.io/badge/runtime-Node.js-339933.svg)](#)
[![Browser](https://img.shields.io/badge/browser-Playwright-45ba63.svg)](https://playwright.dev/)
[![Type](https://img.shields.io/badge/type-OpenClaw%20Skill-f97316.svg)](#)

**一个面向 OpenClaw 的 Binance Square 自动发帖 Skill**

把资讯抓取、草稿生成、状态管理、审核确认和发布动作串成一条可复用的内容运营流程。

</div>

---

## 📖 项目简介

`binance-square-poster` 是一个聚焦 **加密资讯内容生产与发布自动化** 的 OpenClaw Skill 项目。

很多人在做 Binance Square 内容运营时，真正麻烦的不是“发一篇帖”，而是：

- 资讯源分散，人工筛选耗时
- 内容生成格式不稳定，容易反复改
- 发布前缺少统一校验和审核动作
- 状态散落在聊天或临时文件里，难以追踪
- API 发布和浏览器发布流程难以统一

这个项目的目标，就是把 **资讯采集**、**日报草稿生成**、**待发布状态管理**、**确认发送** 和 **Binance Square 发布** 串成一条可执行链路，让它成为一个真正能落地运行的内容自动化 Skill。

---

## ✨ 功能特性

- 📡 **多源 RSS 抓取** - 采集加密、科技等多个资讯源的最新内容
- 🧠 **摘要与正文生成** - 生成资讯摘要、文章草稿和固定模板日报
- 🧱 **模板化输出** - 支持日报结构化拼装与字段校验
- 🗂️ **状态管理** - 维护待发送草稿、发送状态和线程上下文
- ✅ **人工确认机制** - 默认需要审核后再执行最终发布
- 📤 **双发布路径** - 同时保留 API 发布和 Playwright 浏览器发布能力
- 🧪 **调试脚本齐全** - 提供多个 debug / 自动发布脚本便于排查问题
- 🤖 **OpenClaw 集成** - 可作为 Skill 接入 OpenClaw 对话与定时任务体系

---

## 🎯 适用场景

- Binance Square 日报 / 快讯内容运营
- 需要人工审核的半自动发帖流程
- 加密资讯抓取与二次整理
- OpenClaw 技能型内容自动化实验

---

## 📁 目录结构

```bash
binance-square-poster/
├── index.js                    # Skill 入口
├── SKILL.md                    # OpenClaw Skill 规则
├── CHECKLIST.md                # 发布前检查清单
├── config/
│   ├── config.example.json     # 资讯源与发布配置示例
│   └── config.json             # 实际配置文件
├── data/                       # 资讯缓存、草稿、发布正文
├── state/
│   └── pending-posts.json      # 待发送状态记录
├── scripts/
│   ├── fetch-news.js           # RSS 抓取
│   ├── generate-summary.js     # 摘要生成
│   ├── build-daily-report.js   # 日报模板构建
│   ├── validate-daily-report.js # 输出校验
│   ├── confirm-send.js         # 审核后发送
│   ├── post-api.js             # API 发布
│   ├── post-with-browser.js    # 浏览器发布
│   └── auto-post-*.js          # 自动发帖脚本
└── README.md
```

---

## 🛠️ 技术栈

| 模块 | 技术 |
|------|------|
| 运行时 | Node.js |
| 浏览器自动化 | Playwright |
| 数据抓取 | HTTPS + RSS |
| 状态存储 | JSON 文件 |
| 编排方式 | OpenClaw Skill / Cron |
| 发布方式 | Binance Square API + 浏览器流程 |

---

## 🧱 当前已实现内容

### 第一阶段（已完成）
- [x] 多源 RSS 资讯抓取
- [x] 摘要 / 草稿 / 日报模板生成
- [x] 输出格式校验与基础门禁
- [x] 待发送草稿状态管理
- [x] 审核确认后再发送的闭环
- [x] API 发布脚本
- [x] Playwright 浏览器发布脚本
- [x] 自动发帖与调试脚本补齐

### 当前 MVP 能力
- 一键抓取资讯并生成可审核草稿
- 将草稿写入待发送状态，等待确认
- 确认后同步更新发送状态并触发发布
- 在 API 不稳定时切换到浏览器发布路径
- 作为 OpenClaw Skill 参与对话式和定时式调用

---

## 🚀 快速开始

### 1）安装运行环境

```bash
git clone https://github.com/AgentSmithClaw/binance-square-poster.git
cd binance-square-poster

npm install playwright
npx playwright install chromium
```

### 2）配置资讯源和发布参数

```bash
cp config/config.example.json config/config.json
```

然后在 `config/config.json` 中补充：

- 资讯源开关
- Binance Square API Key
- 最低资讯条数
- 发布时间配置

### 3）执行基础流程

```bash
node index.js --fetch
node index.js --summary
node index.js --full
```

### 4）确认发送

```bash
node scripts/confirm-send.js
```

如果需要浏览器方式发帖，可以单独执行：

```bash
node scripts/post-with-browser.js
```

---

## 🗺️ 路线图

### 第二阶段（进行中）
- [ ] 提升资讯筛选、去重和排序能力
- [ ] 提升草稿质量与可读性
- [ ] 继续增强 API 发布稳定性和异常处理
- [ ] 优化 OpenClaw 指令和定时任务接入体验

### 第三阶段（规划中）
- [ ] 增加更细粒度的运营模板和内容风格
- [ ] 增加多账号 / 多主题切换能力
- [ ] 建立更完整的发布审计和结果追踪机制
- [ ] 将内容生产流程沉淀为更稳定的运营工作流

---

## 💡 项目方向

这个项目不是单纯的“发帖脚本集合”，而是一个偏 **内容运营自动化工作流** 的 Skill。

核心想表达的能力包括：

- 把资讯采集和发布动作做成结构化流程
- 在自动化和人工审核之间保留可控边界
- 为 OpenClaw 场景提供可复用的内容型 Skill 模板
- 用真实发布链路验证自动化系统的落地能力

---

## 📌 当前状态

当前已经具备 **可运行的 Skill v1**，并完成了资讯抓取、草稿生成、审核确认、API / 浏览器发布等核心环节。  
下一步重点，是提升内容质量、稳定性和运营级可维护性。

---

<div align="center">

Made for OpenClaw skill workflows, crypto content ops, and review-first automation.

</div>
