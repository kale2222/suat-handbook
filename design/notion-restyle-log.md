# Notion 皮肤改造 — 执行日志

> 分支：`design/notion-restyle` ｜ 执行：自主按 [DESIGN-decision.md](./DESIGN-decision.md) 第四节分步规划
> 本文件记录执行过程中的关键决策、偏差与踩坑，供回顾与回填 PRD。

## 决策与偏差

### D1：不加载 Inter web 字体，改用系统字栈（偏离计划"引入 Inter"）

- **计划原文**：阶段 1「引入 Inter 字体（@fontsource/inter 或 Google Fonts）」。
- **实际**：用系统字栈 `-apple-system, BlinkMacSystemFont, system-ui, "PingFang SC", "Microsoft YaHei", …`，不加载任何 web 字体。
- **理由**：① 站点面向中国大陆 + 校园弱网，Google Fonts 常被屏蔽/极慢；② Inter 不含汉字，页面内中文必然回退到 PingFang/Microsoft YaHei，Inter 仅影响拉丁字母/数字；③ Apple 设备的 system-ui 即 SF Pro，正是 Notion 用 Inter 模仿的对象——观感基本免费拿到；④ 零字体负载，保护弱网首屏。与计划第六节风险表"系统字优先"对策一致。

### D2：不强制 1.5 行高，保留 Infima 偏舒展默认（中文可读性）

- **计划原文**：正文「1.5 行高」。
- **实际**：不覆盖 `--ifm-line-height-base`，保留 Infima 默认（~1.65）。
- **理由**：1.5 源自 Notion 拉丁正文；中文正文行高略大更易读，且默认值已有"文档平静"感。属微调，不影响 Notion 观感主体（暖白画布 + 卡片 + 重标题）。

## 阶段进度

- [x] 阶段 0：建分支 + 基线截图
- [x] 阶段 1：全局令牌
- [x] 阶段 2：首页
- [x] 阶段 3：导航与页脚
- [x] 阶段 4：暗色模式
- [x] 阶段 5：收尾回归（移动端 + 生产构建 + 无报错）

## 收尾状态（2026-06-17）

**已完成并验证**：浅色/暗色 × 桌面/移动 全部走查；`npm run build` 通过、无断链；控制台无报错。

**遗留项（交用户处理）**：
- `docs/学业指南/绩点换算方式.md` 在本分支处于未跟踪态（改造前创建、尚未提交），导致构建告警"部分文件无 git 更新日期"。与皮肤无关，待用户决定何时提交。
- 「改造前后截图对比沉淀到 PRD」：PRD.md 为本地草稿（已 gitignore），属手动步骤。
- **合并分支 + `release.sh` 发版**：发版为对外动作，未自动执行，留待用户审阅本分支后决定。

## 踩坑记录

- **P1（预览环境默认暗色）**：preview 浏览器 `prefers-color-scheme` 默认 dark，Docusaurus 跟随后整页走暗色，`--ifm-background-color` 解析为 Infima 暗色 `#1b1b1d`，一度误以为暖白没生效。强制 `data-theme=light` 后确认 `#f6f5f4` 正确。→ 验证浅色须显式切 light；暗色留到阶段 4。
- **P2（h1 负字距选择器没命中）**：文档页 h1 的直接父元素 class 为空，`.markdown > h1:first-child` 不匹配。改用 `.markdown h1` 后生效。
- **P3（暗色画布令牌被特异性压过）**：在 `[data-theme='dark']`（特异性 0,1,0）里覆盖 `--ifm-background-color` 无效，但同块内自定义 `--suat-hairline` 生效——因 Infima 用更高特异性 `html[data-theme='dark']`（0,1,1）定义了前者。修法：dark 块选择器提升为 `html[data-theme='dark']`。浅色无此问题（双方均在 `:root`，后加载者胜）。
- **P4（暗色 hero 刺眼）**：`hero--primary` 背景取 `--ifm-color-primary`，暗色下翻成亮紫 `#c46fcc`，在暖炭页面上非常刺眼。修法：`html[data-theme='dark'] .hero--primary` 覆盖为深紫 `#45184b` + 暖白字 `#f5f2ee`，对比度充足。
