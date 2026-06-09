# Changelog

## v0.4 - 2026-06-09

首批内容落地，加入性能优化基础设施和贡献者展示。

- 深理工手册新增页面：GK23 时间表、校园卡补办、电费缴纳、体育场馆预约、深理工地图、融媒体矩阵
- 图片性能优化：PNG → WebP（~5MB → ~600KB，-88%），接入 `@docusaurus/plugin-ideal-image` 多分辨率 + 懒加载
- 文档支持 `contributors` frontmatter，swizzle `DocItem/Footer` 在底部渲染"本文贡献者"
- 修复：常用功能相对链接补 `.md` 后缀避免 404

## v0.3 - 2026-06-05

对比 Cloudflare / Netlify / Vercel 访问速度，迁移部署到 Netlify。

- 对比三个平台国内访问体验，Netlify 表现更好
- 首页增加 4 个分类导航卡片（新生指南 / 校园生活 / 学习 / 服务工具）
- 接入不蒜子统计，显示累计访客数和浏览量
- 更新在线访问地址为 suat-handbook.netlify.app

## v0.2 - 2026-06-05

清模板搭目录骨架，更新品牌视觉为深理工紫

## v0.1 - 2026-06-05

部署到 Cloudflare Workers，公网可访问

## v0.0 - 2026-06-04

本地跑通 Docusaurus TypeScript 模板，推送到 GitHub。

- 初始化 Docusaurus 3.10（TypeScript）
- 创建 GitHub 仓库 kale2222/suat-handbook
