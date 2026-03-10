# crypto-news-automation

自动收集加密货币、科技、AI、金融热点资讯，生成每日要点，并自动发布到币安广场。

## 功能

- **多维资讯抓取**：从多个 RSS 源自动抓取加密货币、科技、AI、金融资讯
- **文章生成**：资讯速递 + 技术面分析（24h热门波动币）
- **分类筛选**：支持按分类（crypto/tech/finance）筛选资讯
- **API 发帖**：使用币安 Square OpenAPI 自动发布
- **审核模式**：发布前展示内容供用户确认
- **定时执行**：支持每天固定时间自动运行

---

## 📡 资讯来源（7个RSS源）

### 加密货币
| 来源 | URL | 状态 |
|------|-----|------|
| Cryptonews | https://cryptonews.com/news/feed/ | ✅ |
| CoinTelegraph | https://cointelegraph.com/rss | ✅ |
| BitCoinist | https://bitcoinist.com/feed/ | ✅ |
| Decrypt | https://decrypt.co/feed | ✅ |

### 科技/AI
| 来源 | URL | 状态 |
|------|-----|------|
| TechCrunch | https://techcrunch.com/feed/ | ✅ |
| Wired | https://www.wired.com/feed/rss | ✅ |
| HackerNews | https://hnrss.org/frontpage | ✅ |

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
6. **自动抓取**：generate-article.js 会自动先调用 fetch-news.js 抓取最新资讯
7. **时间排序**：资讯按发布时间排序，最新的在前

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

## 📁 文件结构

```
crypto-news-automation/
├── SKILL.md                    # 技能文档
├── index.js                   # 主入口
├── config/
│   └── config.json           # 配置文件（RSS源列表）
├── data/
│   ├── latest-news.json      # 最新资讯缓存
│   ├── today-article.json    # 今日文章
│   └── pending-post.txt    # 待发布内容
└── scripts/
    ├── fetch-news.js        # 抓取资讯
    ├── generate-summary.js  # 生成摘要
    ├── generate-article.js # 生成文章（自动抓取+生成）
    ├── post-to-binance.js  # API发帖
    ├── post-with-browser.js # 浏览器发帖
    └── save-login-state.js # 保存登录状态
```

---

## ⚙️ 配置说明

### config.json 结构
```json
{
  "sources": [
    {"name": "名称", "url": "RSS链接", "enabled": true, "category": "crypto|tech|finance"}
  ],
  "publish": {
    "platform": "binance-square",
    "minNews": 5,
    "reviewBeforePost": true,
    "schedule": ["09:00", "12:00", "15:00", "18:00", "20:00", "23:00"]
  }
}
```

---

## 更新记录

### 2026-03-09 14:10
- 新增资讯来源：TechCrunch, Wired, HackerNews
- 支持分类筛选：crypto/tech/finance
- 修复资讯按时间排序问题
- generate-article.js 自动先抓取资讯

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

---

## ⚠️ 防回退规则（硬约束）

**禁止重新引入以下旧逻辑**：
- ❌ `content` 作为发帖正文字段
- ❌ `bodyTextOnly: true` 或 `bodyTextOnly: false`（布尔值）
- ❌ `msgType: 'post'` 作为必传字段
- ❌ 任何多余扩展字段（title, author, tag 等）

### 正确发帖 payload 格式

```js
// ✅ 唯一正确格式
const payload = {
  bodyTextOnly: "正文内容字符串"
};

// ❌ 错误格式（禁止使用）
const wrong1 = { content: "xxx" };
const wrong2 = { bodyTextOnly: true };
const wrong3 = { bodyTextOnly: false };
const wrong4 = { bodyTextOnly: "xxx", msgType: "post" };
```

### 代码硬校验

`post-api.js` 中已内置硬校验：
1. payload 必须只有 `bodyTextOnly` 一个字段
2. `bodyTextOnly` 必须是字符串类型（禁止布尔值）
3. `bodyTextOnly` 不能为空

如果校验失败，脚本会直接报错退出，不会发送请求。

---

## 🔴 API 问题根因与修复（2026-03-10）

### 问题描述
- 之前发布后页面显示 "true" 或 "false"，而不是实际内容
- 不是 API Key 问题，不是草稿内容问题

### 根因
- **错误理解**：把 `bodyTextOnly` 当成了布尔开关（true/false）
- **正确理解**：`bodyTextOnly` 本身就是正文字符串

### 成功/失败案例

| 发送内容 | 页面显示 | 结果 |
|----------|----------|------|
| `{ "bodyTextOnly": "HELLO_MINIMAL" }` | HELLO_MINIMAL | ✅ 成功 |
| `{ "bodyTextOnly": true }` | true | ❌ 失败 |
| `{ "bodyTextOnly": false }` | false | ❌ 失败 |
| `{ "content": "xxx", "msgType": "post" }` | 220011 | ❌ 失败 |

### 官方依据
- 接口：`POST /bapi/composite/v1/public/pgc/openApi/content/add`
- 正文字段：`bodyTextOnly`
- 类型：**string**（字符串），不是 boolean

---

## 📋 生成整稿固定模板

### 完整格式（必须严格遵循）

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
1. $BTC (Bitcoin)
- 当前价格: $XX,XXX.XX | 24h涨跌: +X.XX%
- 24h成交量: $X.XXB | 市值排名: #X
- 走势判断: 📈 看涨 | 小幅震荡

2. $ETH (Ethereum)
- ...

你更关注哪一个币的短线机会？欢迎留言讨论。
```

### 固定约束

| 约束项 | 要求 |
|--------|------|
| 资讯速递 | 必须正好 5 条 |
| 资讯标题 | 不得重复 |
| 技术面分析 | 必须正好 5 个币 |
| 技术面字段 | 必须包含：symbol, english_name, price, change_24h, volume_24h, trend |
| 不允许 | 只输出涨跌幅列表 |
| 不允许 | 省略英文名 |
| 不允许 | 省略成交量 |

---

## 🚪 门禁 / 预检查规则

### 数据门禁（必须全部通过）

- [ ] 资讯速递正好 5 条
- [ ] 资讯无重复
- [ ] 每条资讯有效（非空、非乱码）
- [ ] 技术面正好 5 个币
- [ ] 技术面字段完整（6个字段）
- [ ] 技术面数据新鲜（本次生成）

### 模板门禁（必须全部通过）

- [ ] 整稿符合固定模板格式
- [ ] 技术面每条有英文名
- [ ] 严格按模板输出（不偷工减料）

**只有两层都通过，才允许生成整稿**

---

## ✏️ 编辑规则

当用户说以下指令时，可以只重算对应部分，但最终返回必须是完整草稿：

| 用户指令 | 动作 |
|----------|------|
| 资讯速递重新生成 | 只刷新资讯，技术面沿用 |
| 技术面分析重新生成 | 只刷技术面，资讯沿用 |
| 有重复 | 检查并去重 |
| 少了东西 | 补齐缺失字段 |

---

## ✅ 最终验收标准

| 验收项 | 标准 |
|--------|------|
| 接口返回 | `success: true` 不算成功 |
| 真正成功 | 页面真实显示的正文 === 发送内容 |
| 生成成功 | 完整草稿符合模板（5条资讯 + 5个币） |

---

## ⚡ 自动化开关状态（当前）

| 开关 | 状态 | 说明 |
|------|------|------|
| 自动生成 | ❌ 默认关闭 | 需要用户明确指令 |
| 自动推送 | ❌ 默认关闭 | 需要用户明确指令 |
| 自动发布 | ❌ 默认关闭 | 需要用户明确指令 |
| crypto-scheduler.js | ✅ 已禁用 | 重命名为 .disabled |
| crypto-scheduler.service | ✅ 已禁用 | 重命名为 .disabled |

### 手动执行触发词

- "生成加密货币资讯" → 生成草稿
- "发布" / "确认发送" → 发到币安
- "取消" → 清空草稿

---

## 🔒 人工审核流程（唯一流程）

1. 用户说"生成加密货币资讯"
2. 我生成完整草稿（三部分：检查摘要 + 可发布草稿 + 发送提示）
3. 草稿正文保存到 pendingPost
4. 用户审核后说"确认发送"或"发布"
5. 我读取 pendingPost，发送到 Binance
6. 成功后返回链接

**没有用户明确指令，绝不自动生成/推送/发布**
