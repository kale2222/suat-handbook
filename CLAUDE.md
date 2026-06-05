# suat-handbook

学生发起、面向深圳理工大学（深理工 / SUAT）准新生 + 在校生的开源在线信息手册。

## 项目定位

- **目标读者**：高考录取后的准新生（6–8 月窗口期）、在校生
- **核心价值**：学生视角的真实信息，填补官方手册的空白
- **核心假设**：学生视角内容比官方手册传播力更强，会被自发分享

## 技术栈

- Docusaurus 3.10（TypeScript）
- 部署：Cloudflare Pages（自动构建）
- 仓库：https://github.com/kale2222/suat-handbook

## 常用命令

```bash
npm start          # 启动本地开发服务器 → http://localhost:3000
npm run build      # 构建生产版本
npm run typecheck  # TypeScript 类型检查
```

## 发布新版本

```bash
./scripts/release.sh v0.x "这个版本做了什么"
```

自动完成：更新 CHANGELOG.md → commit → 打 git tag → push（含 tags）。版本历史见 [CHANGELOG.md](CHANGELOG.md) 和 GitHub Releases。

## 内容结构（规划中）

```
docs/
  新生指南/
  校园生活/
  学习/
  服务工具/
```

## 版本迭代计划

| 版本 | 目标     | 验证标准                       |
| ---- | -------- | ------------------------------ |
| V0.0 | 本地能跑 | localhost:3000 打开默认页面    |
| V0.1 | 部署公网 | 拿到 xxx.pages.dev，手机能打开 |
| V0.2 | 目录骨架 | 左侧显示 4 个空分类            |
