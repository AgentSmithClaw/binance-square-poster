# 🚀 binance-square-poster

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Skill-orange.svg)](https://github.com/openclaw/openclaw)

**OpenClaw 平台的 Binance Square 自动发帖 Skill**

</div>

---

## 📖 项目简介

`binance-square-poster` 是一个运行在 [OpenClaw](https://github.com/openclaw/openclaw) 平台上的 **Agent Skill**，用于自动化采集加密货币资讯并发布到 Binance Square（币安广场）。

> ⚠️ **注意**：本项目不是一个独立的 SaaS 平台或后端服务，而是一个 **OpenClaw 技能（Skill）**，需要配合 OpenClaw 框架使用。

---

## ✨ 功能特性

- 📡 **多源资讯抓取** - 自动采集加密货币、科技、AI 热点资讯
- 📝 **智能文章生成** - 资讯速递 + 技术面分析，自动生成可读性强的内容
- 🤖 **OpenClaw 集成** - 作为 Skill 运行，可通过对话指令触发
- ✅ **审核机制** - 发布前需人工确认，支持"确认发送"指令
- 📊 **状态管理** - 自动追踪待发送草稿、发送状态
- 🔄 **Payload 兼容** - 自动适配 Binance Square OpenAPI 最新格式

---

## 📁 目录结构

```
binance-square-poster/
├── SKILL.md                   # Skill 核心规则（资讯速递、技术面分析、锁定逻辑）
├── CHECKLIST.md               # 发布前检查清单
├── NOTES.md                   # 开发笔记
├── README.md                  # 本文档
├── index.js                   # Skill 入口文件
├── config/
│   ├── config.example.json    # 配置示例
│   └── config.json           # 实际配置（不提交）
├── data/
│   ├── latest-news.json       # 最新抓取的资讯
│   ├── today-article.json     # 今日生成的草稿
│   └── pending-post.txt       # 待发送的草稿
├── scripts/
│   ├── fetch-news.js          # 资讯抓取脚本
│   ├── generate-article.js    # 文章生成脚本
│   ├── post-api.js            # API 发布脚本
│   ├── confirm-send.js       # 确认发送逻辑
│   └── state-manager.js       # 状态管理
└── state/
    └── pending-posts.json     # 发送状态记录
```

---

## 🛠️ 依赖环境

| 依赖 | 说明 |
|------|------|
| **OpenClaw** | 必须安装并运行在本地或服务器 |
| **Node.js** | 18+ 版本 |
| **Binance 登录态** | 浏览器中已登录 Binance 账号 |
| **Binance Square OpenAPI Key** | 从 [Binance Creator Center](https://www.binance.com/square/creator) 获取 |

---

## 🚀 快速开始

### 1. 安装 Skill

将本项目复制到 OpenClaw 的 Skills 目录：

```bash
# 假设 OpenClaw 安装在 ~/.openclaw
cp -r binance-square-poster ~/.openclaw/workspace/.agents/skills/
```

### 2. 配置 API Key

```bash
cd ~/.openclaw/workspace/.agents/skills/binance-square-poster
cp config/config.example.json config/config.json
# 编辑 config.json，填入你的 API Key
```

### 3. 在 OpenClaw 中使用

通过对话指令触发：

| 指令 | 说明 |
|------|------|
| `生成加密货币资讯` | 抓取资讯 + 生成草稿 |
| `资讯速递正确了` | 锁定当前资讯速递 |
| `生成新草稿` | 沿用锁定资讯 + 刷新技术面 + 生成草稿 |
| `确认发送` / `发布` | 确认后发送到 Binance Square |

---

## 📝 工作流程

```
1. 用户发送 "生成加密货币资讯"
        ↓
2. Skill 自动抓取最新资讯（5条去重）
        ↓
3. 获取技术面数据（5个热门币种）
        ↓
4. 生成完整草稿（含检查摘要 + 正文 + 发送提示）
        ↓
5. 保存到 pendingPost，等待用户审核
        ↓
6. 用户审核后发送 "确认发送"
        ↓
7. 读取 pendingPost → 调用 Binance API → 返回帖子链接
```

---

## ⚠️ 注意事项

1. **API Key 安全** - `config.json` 已加入 `.gitignore`，不要提交到 GitHub
2. **发布限制** - Binance Square 每日发帖有上限，请合理安排发布时间
3. **内容规范** - 发布前请确认内容符合社区规范
4. **审核机制** - 默认需要人工确认后才发送，不可自动发布

---

## 🔧 进阶配置

### 修改定时发布时间

在 OpenClaw 中配置 Cron 任务：

```bash
# 每天 9:00, 12:00, 15:00, 18:20:00, 23:00 自动生成草稿
0 9,12,15,18,20,23 * * * /path/to/openclaw run crypto-news-automation
```

### 自定义资讯来源

编辑 `config/config.json` 中的 `sources` 字段：

```json
{
  "sources": [
    {"name": "CoinTelegraph", "url": "https://cointelegraph.com/rss", "enabled": true, "category": "crypto"}
  ]
}
```

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<div align="center">

Made with ❤️ for OpenClaw

</div>
