# crypto-news-automation 发布检查清单

每次修改 generate-article.js 后，必须执行以下检查：

## 1. 运行测试
```bash
cd ~/.openclaw/workspace/.agents/skills/crypto-news-automation
node scripts/generate-article.js
```

## 2. 对照SKILL.md模板检查输出

### 资讯速递格式
- [ ] 有标题 `📰 加密货币日报 · YYYY-MM-DD`
- [ ] 有分隔线 `---`
- [ ] 有 `【资讯速递】` 标题
- [ ] 5条资讯，每条单独编号
- [ ] **资讯是中文**（有翻译或用AI翻译）

### 技术面分析格式
- [ ] 有 `【技术面分析 - 24h热门波动币】` 标题
- [ ] 5个币种，每个格式如下（4行）：
```
1. $ETH (Ethereum)
   当前价格: $2,000 | 24h涨跌: +2.5%
   24h成交量: $20B | 市值排名: #2
   走势判断: 📈 看涨 | 小幅震荡
```

### 结尾
- [ ] 有分隔线 `---`
- [ ] 有 `回复「确认发送」→ 发布到币安`

## 3. 推送测试
用 feishu-send.sh 测试发送到群
