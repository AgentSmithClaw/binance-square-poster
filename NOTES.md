# crypto-news-automation 关键结论汇总

> 更新日期：2026-03-10
> 本文件记录 API 问题修复和发文格式定稿的所有关键结论

---

## 🔴 API 问题根因

### 问题现象
- 之前发布后页面显示 "true" 或 "false"，而不是实际内容

### 根因
- **错误理解**：把 `bodyTextOnly` 当成了布尔开关（true/false）
- **正确理解**：`bodyTextOnly` 本身就是正文字符串，不是布尔值

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

## 📋 唯一正确的发帖 payload

```js
// ✅ 唯一正确格式
const payload = {
  bodyTextOnly: "完整正文内容"
};

// ❌ 错误格式（禁止使用）
{ content: "xxx" }
{ bodyTextOnly: true }
{ bodyTextOnly: false }
{ bodyTextOnly: "xxx", msgType: "post" }
```

---

## 📋 生成整稿固定模板

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

---

## 🚪 门禁规则

### 数据门禁
- [ ] 资讯速递正好 5 条
- [ ] 资讯无重复
- [ ] 每条资讯有效
- [ ] 技术面正好 5 个币
- [ ] 技术面字段完整（6个字段）

### 模板门禁
- [ ] 整稿符合固定模板格式
- [ ] 技术面每条有英文名

---

## ⚡ 自动化开关状态

| 开关 | 状态 |
|------|------|
| 自动生成 | ❌ 默认关闭 |
| 自动推送 | ❌ 默认关闭 |
| 自动发布 | ❌ 默认关闭 |
| crypto-scheduler.js | ✅ 已禁用 |
| crypto-scheduler.service | ✅ 已禁用 |

### 手动触发词
- "生成加密货币资讯" → 生成草稿
- "发布" / "确认发送" → 发到币安
- "取消" → 清空草稿

---

## 🔒 人工审核流程

1. 用户说"生成加密货币资讯"
2. 生成完整草稿（三部分：检查摘要 + 可发布草稿 + 发送提示）
3. 草稿正文保存到 pendingPost
4. 用户审核后说"确认发送"或"发布"
5. 读取 pendingPost，发送到 Binance
6. 成功后返回链接

---

## 📁 相关文件

| 文件 | 用途 |
|------|------|
| SKILL.md | 完整技能文档 |
| post-api.js | 发帖 API（含硬校验） |
| generate-article.js | 生成文章 |
| state-manager.js | 状态管理 |
| confirm-send.js | 确认发送脚本 |

---

## ✅ 验收标准

- 接口返回 `success: true` 不算成功
- 只有页面真实显示的正文 === 发送内容，才算发帖成功
