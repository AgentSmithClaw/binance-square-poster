# crypto-news-automation

自动收集加密货币热点资讯，生成每日要点，并自动发布到币安广场。

## 功能

- **资讯抓取**：从多个 RSS 源自动抓取最新加密货币资讯
- **文章生成**：资讯速递 + 技术面分析（24h热门波动币）
- **AI 摘要**：使用 LLM 生成要点
- **API 发帖**：使用币安 Square API 自动发布
- **审核模式**：发布前展示内容供用户确认
- **定时执行**：支持每天固定时间自动运行

---

## 文章结构

### 第一部分：资讯速递
- 来源：主流加密货币资讯网站（Cryptonews等）
- 内容：5条最新资讯，中文翻译
- 格式：编号 + 标题 + 来源

### 第二部分：技术面分析
- 数据来源：CoinGecko API
- 内容：24h内涨跌幅最大的5个加密货币
- 包含字段：价格、涨跌幅、成交量、市值排名、走势判断

### 示例输出

```
【资讯速递】

1. 佛罗里达州议员推进首个州级稳定币监管法案
   来源: Cryptonews
2. 特朗普国家网络安全战略支持后量子时代的加密安全
   来源: Cryptonews
...

【技术面分析 - 24h热门波动币】

1. $BSB (Block Street)
   当前价格: $0.135 | 24h涨跌: +8.18%
   24h成交量: $252.98M | 市值排名: #652
   走势判断: 📈 看涨 | 波动剧烈

2. $XAUT (Tether Gold)
   当前价格: $5,046 | 24h涨跌: -1.96%
   ...
```

---

## API发帖教程

### 正确调用方式 ⚠️

**重要**：必须使用 `X-Square-OpenAPI-Key` 作为 header，不是 `binance-api-key`！

### API 端点

```
POST https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add
```

### 请求 Header

| Header | 值 |
|--------|-----|
| X-Square-OpenAPI-Key | 你的API Key |
| Content-Type | application/json |
| clienttype | binanceSkill |

### 请求 Body

```json
{
  "bodyTextOnly": "文章内容..."
}
```

### 示例

```bash
curl -X POST 'https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add' \
  -H 'X-Square-OpenAPI-Key: 你的API Key' \
  -H 'Content-Type: application/json' \
  -H 'clienttype: binanceSkill' \
  -d '{
    "bodyTextOnly": "#加密货币日报\n\n内容..."
  }'
```

### 响应

成功时返回：
```json
{
  "code": "000000",
  "data": {
    "id": "299xxxxx",
    "shareLink": "https://app.binance.com/uni-qr/..."
  },
  "success": true
}
```

帖子链接：`https://www.binance.com/square/post/{id}`

---

## 常见错误

| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| 220003 | API Key not found | 检查Key是否正确，确保使用 `X-Square-OpenAPI-Key` header |
| 10004 | 网络错误 | 重试 |
| 20002 | 敏感词 | 修改内容 |
| 20013 | 内容过长 | 缩短内容 |

---

## 当前配置

| 项目 | 值 |
|------|-----|
| **API Key** | 你的API Key |
| **发帖方式** | API (X-Square-OpenAPI-Key) |
| **审核模式** | ✅ 开启 |
| **定时** | 09:00 / 12:00 / 15:00 / 18:00 / 20:00 / 23:00 |

---

## 使用方法

### 手动执行

```bash
# 抓取资讯并生成文章
cd ~/.openclaw/workspace/.agents/skills/crypto-news-automation
node scripts/fetch-news.js
node scripts/generate-article.js

# 审核后发布
# 内容会保存到 data/pending-post.txt
# 确认后调用 API 发布
```

### 发布脚本

```bash
# 读取待发布内容并发布
CONTENT=$(cat data/pending-post.txt)
curl -X POST 'https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add' \
  -H 'X-Square-OpenAPI-Key: 你的Key' \
  -H 'Content-Type: application/json' \
  -H 'clienttype: binanceSkill' \
  -d "{\"bodyTextOnly\": \"$CONTENT\"}"
```

---

## 更新记录

### 2026-03-09
- 新增文章结构：资讯速递 + 技术面分析
- 修复 API header：从 `binance-api-key` 改为 `X-Square-OpenAPI-Key`
- 增加技术面分析脚本：generate-article.js

### 2026-03-08
- 初始版本
- 集成币安 Square API 发帖

---

## 依赖

- Node.js
- curl
- CoinGecko API (免费)
- RSS 订阅源

---

## 注意事项

- API Key 需在币安广场创作者中心创建
- 每个账号最多创建 1 个 API Key
- 每日发文上限 100 条
- 目前仅支持纯文本帖子
- **发布前必须审核**，确认后才会发送
- **发送后返回帖子链接**
