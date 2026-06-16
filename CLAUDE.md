# suat-handbook

学生发起、面向深圳理工大学（深理工 / SUAT）准新生 + 在校生的开源在线信息手册。基于 Docusaurus 3.10。

## 项目定位

- **目标读者**：高考录取后的准新生（6–8 月窗口期）、在校生
- **核心价值**：学生视角的真实信息，填补官方手册的空白
- **核心假设**：学生视角内容比官方手册传播力更强，会被自发分享

## 常用命令

```bash
npm start          # dev 服务器，HMR
npm run build      # 生产构建
npm run serve      # 预览生产构建（看真实 git 时间、ideal-image 效果）
./scripts/release.sh v0.x "描述"   # 更新 CHANGELOG + commit + tag + push
```

## 内容策略

内容已按 4 类 IA 拆分为一级目录：`🏃 办事指南 / 🍜 校园生活 / 📚 学业指南 / 🎓 新生指南`（外加落地页 `深理工手册` 和 `致谢`）。各目录的 emoji 标签与排序由其 `_category_.json` 控制，侧栏自动生成。

加文档 3 步：

1. 按内容归类，在对应目录（如 `docs/办事指南/`）新建 `xxx.md`
2. 顶部加 frontmatter `contributors: [名字]`（会渲染到文章底部"本文贡献者"行）
3. 侧栏会自动收录；如需在落地页 [docs/深理工手册/index.md](docs/深理工手册/index.md) 的「常用功能」列表露出，手动加链接，跨目录用相对路径（如 `../办事指南/xxx.md`），**带 `.md` 后缀**（否则会 404）

加图片走 WebP 流水线，详见我的 `feedback-image-pipeline` 记忆。

## 主题定制

通过 swizzle 实现：

- [src/theme/DocItem/Footer/index.tsx](src/theme/DocItem/Footer/index.tsx) — 文档底部多渲染一行"本文贡献者"（读 frontmatter）

新增 swizzle 文件后通常要 `rm -rf .docusaurus && npm start` 一次。

## 已知小坑

- **dev 模式"最后更新时间"始终是 2018-10-14**：Docusaurus 故意用硬编码值替代 git log 提速，prod build 才真实。
- **`@generated/...` Module not found**：改 config / 装卸插件后 `.docusaurus/` 缓存不一致。`rm -rf .docusaurus && npm start` 即可。
- **macOS Rosetta 架构错配**：用户终端是 arm64 原生，但 Claude 的 bash 默认 x86_64（Rosetta）。**所有 `npm install/rebuild` 和 brew arm64 二进制（`cwebp` 等）必须用 `arch -arm64` 前缀**，否则装错 arch 的原生模块（sharp/rspack/esbuild 等），用户 `npm start` 就崩。前面踩过两次（rspack、sharp）。

## 下一阶段

| 版本 | 目标                   |
| ---- | ---------------------- |
| v0.5 | 内容量爆发（≥15 篇）   |
| 之后 | 重新分类拆分一级目录   |

历史版本见 [CHANGELOG.md](CHANGELOG.md)。
