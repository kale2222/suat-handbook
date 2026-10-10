# SUAT 手册

学生发起、面向深圳理工大学准新生 + 在校生的开源在线信息手册。

**在线访问**：https://suat-handbook.netlify.app/

## 本地开发

```bash
npm install
npm start       # 启动开发服务器 → http://localhost:3000
npm run build   # 构建生产版本
```

## 发布新版本

```bash
./scripts/release.sh v0.x "这个版本做了什么"
```

## 参与贡献

内容在 `docs/` 目录下，直接编辑 Markdown 文件，提 PR 即可。

## 数据分析

统计与文章反馈的范围见 [MVP 规格](design/analytics-mvp.md)，PostHog 开通、生产环境变量、仪表板和验收步骤见 [部署与使用说明](design/analytics-operations.md)。本地和部署预览默认不采集；正式站点需要配置项目令牌才能启用 PostHog 和反馈。访客可在页脚「统计说明与设置」中同时关闭 PostHog 与不蒜子统计。
