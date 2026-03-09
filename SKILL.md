# crypto-news-automation

自动收集加密货币热点资讯，生成每日要点，并自动发布到币安广场。

## 功能

- **资讯抓取**：从多个 RSS 源自动抓取最新加密货币资讯
- **文章生成**：资讯速递 + 技术面分析（24h热门波动币）
- **API 发帖**：使用币安 Square OpenAPI 自动发布
- **审核模式**：发布前展示内容供用户确认
- **定时执行**：支持每天固定时间自动运行

---

## 📝 文章结构（固定模板）

### 第一部分：资讯速递
- 5条最新资讯，中文翻译
- **不要来源信息**
- 格式：编号 + 标题

### 第二部分：技术面分析
- 数据来源：CoinGecko API
- 24h内涨跌幅最大的5个加密货币
- 每个币种包含：
  - 编号 + 币种符号
  - 当前价格
  - 24h涨跌
  - 24h成交量
  - 市值排名
  - 走势判断（📈/📉 + 看涨/看跌 + 小幅震荡/波动剧烈）

---

## 📋 固定模板格式

```
📰 加密货币日报 · YYYY-MM-DD
━━━━━━━━━━━━━━
【资讯速递】
1. 资讯标题1
2. 资讯标题2
3. 资讯标题3
4. 资讯标题4
5. 资讯标题5

【技术面分析 - 24h热门波动币】
1. $币种
- 当前价格: $价格 | 24h涨跌: 百分比%
- 24h成交量: $成交量 | 市值排名: #排名
- 走势判断: emoji 判断 | 描述

2. $币种
- 当前价格: $价格 | 24h涨跌: 百分比%
- 24h成交量: $成交量 | 市值排名: #排名
- 走势判断: emoji 判断 | 描述

...（共5个）

━━━━━━━━━━━━━━
回复「确认发送」→ 发布到币安
```

---

## ⚠️ 重要注意事项

1. **分隔线**：使用 "━━━━" 字符
2. **编号**：使用数字编号，每条单独一行
3. **技术面**：每个币种4行，包含价格、涨跌、成交量、排名、走势
4. **不显示来源**：资讯速递不要显示 "来源: xxx"
5. **飞书API**：content字段必须是JSON字符串格式

---

## 🔑 币安Square API（官方binance-square-post）

### API 端点
```
POST https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add
```

### 请求 Header

| Header | Required | Description |
|--------|----------|-------------|
| X-Square-OpenAPI-Key | Yes | Square OpenAPI Key |
| Content-Type | Yes | application/json |
| clienttype | Yes | binanceSkill |

### 请求 Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **bodyTextOnly** | string | Yes | 帖子内容（支持#标签） |

⚠️ **注意**：字段名是 `bodyTextOnly`，不是 `content`！

### 示例

```bash
curl -X POST 'https://www.binance.com/bapi/composite/v1/public/pgc/openApi/content/add' \
  -H 'X-Square-OpenAPI-Key: your_api_key' \
  -H 'Content-Type: application/json' \
  -H 'clienttype: binanceSkill' \
  -d '{
    "bodyTextOnly": "测试发帖内容"
  }'
```

### 成功响应

```json
{
  "code": "000000",
  "data": {
    "id": "299588577667362",
    "shareLink": "https://app.binance.com/uni-qr/cpos/299588577667362"
  },
  "success": true
}
```

帖子链接：`https://www.binance.com/square/post/{id}`

### 错误码

| Code | Description |
|------|-------------|
| 000000 | 成功 |
| 10004 | 网络错误 |
| 10005 | 需要身份验证 |
| 10007 | 功能不可用 |
| 20002 | 敏感词 |
| 20013 | 内容过长 |
| 20020 | 内容不能为空 |
| 20022 | 含风险词段 |
| 220003 | API Key不存在 |
| 220004 | API Key已过期 |
| 220009 | 每日发帖上限 |
| 220011 | Content must not be empty |

---

## 🔐 安全规则

1. **不要显示完整Key**：只显示首5+末4位，如 `04091...ea4b`
2. **发帖前审核**：必须展示内容供用户确认
3. **成功后返回链接**：返回 `https://www.binance.com/square/post/{id}`

---

## 更新记录

### 2026-03-09 13:50
- 整合官方 binance-square-post skill
- 修正字段名：bodyTextOnly
- 增加错误码说明

### 2026-03-09 13:10
- **重大修复**：字段名从 `content` 改为 `bodyTextOnly`
- 查看官方 binance-skills-hub 文档

### 2026-03-09
- 更新文章模板格式
- 修复飞书换行显示问题
- 修复飞书API content格式
- 去资讯不要显示来源
