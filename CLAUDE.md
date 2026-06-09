# suat-handbook

学生发起、面向深圳理工大学（深理工 / SUAT）准新生 + 在校生的开源在线信息手册。

## 项目定位

- **目标读者**：高考录取后的准新生（6–8 月窗口期）、在校生
- **核心价值**：学生视角的真实信息，填补官方手册的空白
- **核心假设**：学生视角内容比官方手册传播力更强，会被自发分享

## 技术栈

- Docusaurus 3.10（TypeScript）
- 图片优化插件：`@docusaurus/plugin-ideal-image`
- 部署：Netlify（自动构建）
- 仓库：https://github.com/kale2222/suat-handbook

## 常用命令

```bash
npm start          # 启动本地开发服务器 → http://localhost:3000（HMR）
npm run build      # 生产构建
npm run serve      # 预览生产构建（看真实最后更新时间、ideal-image 效果）
npm run typecheck  # TypeScript 类型检查
```

## 发布新版本

```bash
./scripts/release.sh v0.x "这个版本做了什么"
```

自动完成：更新 CHANGELOG.md → commit → 打 git tag → push（含 tags）。版本历史见 [CHANGELOG.md](CHANGELOG.md) 和 GitHub Releases。

## 内容策略

当前阶段（v0.4）**所有内容都堆到 [docs/深理工手册/](docs/深理工手册/) 的「常用功能」列表里**，暂不做精细分类。等内容量到一定程度（凭直觉≥20 篇）再考虑拆分到 `新生指南 / 校园生活 / 学习 / 服务工具` 这四个一级目录。

```
docs/
  深理工手册/         # 当前内容都在这里
    index.md         # 常用功能链接列表
    images/          # 文档图片，co-locate
    *.md
  新生指南/           # 占位
  校园生活/           # 占位
  学习/               # 占位
  服务工具/           # 占位
```

## 添加新内容

### 加文档

1. 在 [docs/深理工手册/](docs/深理工手册/) 下新建 `xxx.md`
2. 文件顶部加 frontmatter：
   ```yaml
   ---
   contributors: [名字1, 名字2]
   ---
   ```
3. 在 [docs/深理工手册/index.md](docs/深理工手册/index.md) 的「常用功能」列表加链接，**带 `.md` 后缀**（否则相对路径会 404）

### 加图片（强制走优化流程）

1. 用 `cwebp` 压缩为 WebP（macOS Apple Silicon 用 arm64）：
   ```bash
   arch -arm64 /opt/homebrew/bin/cwebp -q 80 -resize 1200 0 in.png -o out.webp
   ```
   - 只下采样不上采样：原图 < 1200px 时去掉 `-resize`
   - 文件名不要带空格（之前踩过 URL 编码坑）
2. 放到 `docs/深理工手册/images/` 下（co-locate 让 plugin-ideal-image 能扫到）
3. md 里用 markdown 语法引用，**不要用 `<img>`**：
   ```md
   <div style={{maxWidth: "80%"}}>

   ![alt 描述](./images/xxx.webp)

   </div>
   ```
   - 用 `<img>` 会绕过 plugin-ideal-image，拿不到响应式 + 懒加载
   - 特殊样式（旋转等）包到 wrapper `<div style={...}>` 上

可以攒一批图片一起处理。

## 主题定制

通过 swizzle 实现：

- [src/theme/DocItem/Footer/index.tsx](src/theme/DocItem/Footer/index.tsx) — 在文档底部多渲染一行"本文贡献者"（读 frontmatter 的 `contributors`）

新增 swizzle 文件后通常要 `rm -rf .docusaurus && npm start` 一次（webpack 生成代码需要刷新）。

## 已知小坑

- **dev 模式下"最后更新时间"始终是 2018-10-14**：Docusaurus 故意用硬编码值替代 `git log` 提速，prod build 才真。底部有小字 "(Simulated during dev for better perf)" 提示。
- **`@generated/...` Module not found**：通常发生在改完 `docusaurus.config.ts`、装/卸插件后，`.docusaurus/` 缓存不一致。`rm -rf .docusaurus && npm start` 即可。
- **macOS x86_64 shell + arm64 brew**：默认 zsh 跑在 Rosetta 下，调 `/opt/homebrew/bin/*` 的 arm64 二进制要前缀 `arch -arm64`。

## 版本迭代计划

| 版本 | 目标                         | 状态  |
| ---- | ---------------------------- | ----- |
| v0.0 | 本地跑通                     | ✅    |
| v0.1 | 部署公网（Cloudflare）       | ✅    |
| v0.2 | 目录骨架 + 品牌视觉          | ✅    |
| v0.3 | 迁移到 Netlify + 首页卡片    | ✅    |
| v0.4 | 首批内容 + 性能基础 + 署名   | ✅    |
| v0.5 | 内容量爆发（≥15 篇）         | 进行中 |
| 之后 | 重新分类拆分一级目录         | -     |
