# Crypto News Automation

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/AgentSmithClaw/crypto-news-automation)](https://github.com/AgentSmithClaw/crypto-news-automation/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/AgentSmithClaw/crypto-news-automation)](https://github.com/AgentSmithClaw/crypto-news-automation/network)

**自动化加密货币/科技资讯采集与发布工具**

[English](./README.md) | [中文](./README_ZH.md)

</div>

---

## ✨ 特性

- 📡 **多源资讯抓取** - 从7个RSS源自动采集加密货币、科技、AI资讯
- 📝 **智能文章生成** - 资讯速递 + 技术面分析
- 📊 **技术面分析** - 24h热门波动币种数据
- 🤖 **自动发布** - 集成币安 Square OpenAPI
- ⏰ **定时执行** - 支持每天固定时间自动运行
- ✅ **审核机制** - 发布前人工确认

---

## 📋 资讯来源

### 加密货币
| 来源 | URL |
|------|-----|
| Cryptonews | https://cryptonews.com/news/feed/ |
| CoinTelegraph | https://cointelegraph.com/rss |
| BitCoinist | https://bitcoinist.com/feed/ |
| Decrypt | https://decrypt.co/feed |

### 科技/AI
| 来源 | URL |
|------|-----|
| TechCrunch | https://techcrunch.com/feed/ |
| Wired | https://www.wired.com/feed/rss |
| HackerNews | https://hnrss.org/frontpage |

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/AgentSmithClaw/crypto-news-automation.git
cd crypto-news-automation
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置

```bash
# 复制配置示例
cp config/config.json config/config.json.bak

# 编辑配置文件，添加你的 API Key
# API Key 从 https://www.binance.com/square/creator 获取
```

### 4. 运行

```bash
# 抓取资讯
node scripts/fetch-news.js

# 生成文章
node scripts/generate-article.js

# 发布到币安
node scripts/post-to-binance.js
```

---

## 📁 项目结构

```
crypto-news-automation/
├── README.md                    # 项目文档
├── SKILL.md                    # 技能说明
├── index.js                   # 主入口
├── config/
│   └── config.json           # 配置文件
├── data/
│   ├── latest-news.json     # 资讯缓存
│   ├── today-article.json   # 今日文章
│   └── pending-post.txt     # 待发布
└── scripts/
    ├── fetch-news.js        # 资讯抓取
    ├── generate-article.js  # 文章生成
    ├── post-to-binance.js   # API发布
    └── post-with-browser.js # 浏览器发布
```

---

## ⚙️ 配置说明

```json
{
  "sources": [
    {"name": "名称", "url": "RSS链接", "enabled": true, "category": "crypto|tech"}
  ],
  "publish": {
    "platform": "binance-square",
    "apiKey": "YOUR_API_KEY",
    "reviewBeforePost": true,
    "schedule": ["09:00", "12:00", "15:00", "18:00", "20:00", "23:00"]
  }
}
```

---

## 📝 文章模板

```
📰 加密货币日报 · 2026-03-09
━━━━━━━━━━━━━━
【资讯速递】
1. 资讯标题1
2. 资讯标题2
3. 资讯标题3
4. 资讯标题4
5. 资讯标题5

【技术面分析 - 24h热门波动币】
1. $BTC
- 当前价格: $67,000 | 24h涨跌: +2.5%
- 24h成交量: $50B | 市值排名: #1
- 走势判断: 📈 看涨 | 震荡上行

...
━━━━━━━━━━━━━━
```

---

## 🔧 定时任务

使用 cron 设置定时执行：

```bash
# 每天 9:00, 12:00, 15:00, 18:00, 20:00, 23:00 执行
0 9,12,15,18,20,23 * * * cd /path/to/crypto-news-automation && node scripts/generate-article.js
```

---

## ⚠️ 注意事项

1. **API Key 安全** - 不要将包含真实 Key 的配置文件提交到 GitHub
2. **每日限制** - 币安 Square 每日发帖有上限
3. **内容审核** - 发布前请确认内容符合社区规范

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 贡献

欢迎提交 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'Add xxx'`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

---

<div align="center">

Made with ❤️ by [Smith](https://github.com/AgentSmithClaw)

</div>
