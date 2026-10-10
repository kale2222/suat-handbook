# 埋点部署与使用

已确认范围见 [analytics-mvp.md](./analytics-mvp.md)。源代码接入不等于线上已开通；下列账户、环境配置及仪表板需要实际完成。

## 1. 创建项目并接入

1. 在 PostHog Cloud 创建不绑卡免费账户及项目，选择服务区域，核实当前免费额度与一年保留期。仅使用 Product Analytics，不开启回放、自动采集或其他付费功能。
2. 在项目设置取得 **Project API key/token**（通常为 `phc_` 前缀）和对应的 ingestion host。此公有项目令牌会进入浏览器包；不要填 Personal API key 或其他管理密钥。
3. 在 Netlify 的 Production 构建环境设置：
   - `POSTHOG_PROJECT_KEY`：上述项目令牌。
   - `POSTHOG_API_HOST`：US 为 `https://us.i.posthog.com`，EU 为 `https://eu.i.posthog.com`，以项目设置为准。
4. Netlify 自动提供 `CONTEXT=production`。代码还校验浏览器 origin 必须等于 `docusaurus.config.ts` 中的 `customFields.analytics.origin`（当前 `https://suat-handbook.netlify.app`）。迁移正式域名时同步修改站点 URL 和这个 origin。
5. 重新构建并部署。变量在构建时写入，单独修改环境变量不会改变已有产物。缺少项目令牌时 PostHog 和反馈关闭，不蒜子仍可在正式域名运行；非生产环境两套统计均关闭。

本地无需配置真实令牌。网络验收可用浏览器拦截把正式域名映射到本地生产构建，并使用假令牌与模拟接收端，避免污染真实项目。

## 2. 事件字典

| 事件 | 触发 | 业务属性 |
| --- | --- | --- |
| `$pageview` | 首次加载与 pathname 改变 | `$pathname`、清理后的 `$current_url`、`$title`、`is_test` |
| `article_feedback` | 完成一次文章反馈 | 同上，及 `article_path`、`rating`、`reason` |

- 路径统一去尾部斜杠并解码可读中文；参数和锚点不进入事件。
- `rating`：`helpful` / `partly_helpful` / `not_helpful`。
- `reason`：`outdated` / `unclear` / `missing` / `broken_link` / `none`（未填或有帮助）。当前 UI 选择一个主要原因。
- 所有业务事件包含布尔值 `is_test`，默认 false；另保留 SDK 必要的匿名标识、会话标识、版本等字段，关闭人物档案和 IP 地理定位处理。
- 每篇文章本地存储最后反馈日期，而非服务端唯一约束；支持 Web Locks 的浏览器跨标签页串行提交。清除存储、换设备仍可再次提交。
- SDK 接受事件不代表网络交付成功。浏览器离线时阻止提交；网络拦截和服务故障可能造成缺失，后台数据不是严格业务账本。
- `posthog-js` 固定为 1.438.7：该版本的 opt-out 不清空已排队事件，因此退出后、刷新前同时关闭实例的 `__loaded` 发送门。升级 SDK 时核实其请求分发实现，并回归测试未发送批次、失败重试及其他标签页退出，保证退出后的刷新不会补发数据。

## 3. 创建仪表板

项目与报表时区设为 `Asia/Shanghai`。建立「手册内容维护」仪表板，默认最近 7 天；每个 insight 都加 `is_test = false` 过滤条件，按需要切换最近 30 天或自定义区间。

1. **访问概况**：Trends 的 `$pageview`，分别选择 Total count 和 Unique users，按日绘图。
2. **文章排行**：`$pageview`，筛选 `$pathname` 以 `/docs/` 开头，按 `$pathname` 拆分；分别建立 Total count、Unique users 表格，默认按总次数降序。增大显示条数或按路径筛选，以查看榜单外文章。
3. **文章反馈**：`article_feedback` 的 Total count；按 `article_path` 和 `rating` 拆分。另建仅按 `article_path` 拆分的总数表，避免把“人数”误作反馈次数。
4. **问题原因**：`article_feedback`，排除 `reason = none`，按 `article_path` 和 `reason` 拆分，使用 Total count。

首次接收事件后再配置属性筛选。如果当前后台不支持所需表格布局，保留相同事件口径拆为多张 insight，不合成质量分。验证同一浏览器访问两次是两个 PV、一个估算访客，三档反馈合计与文章反馈总数一致。

每周优先检查：高访问且未核实的文章、反复收到负面反馈的文章，以及最多的具体原因。反馈基数少时先人工核查，不根据百分比自动判断质量。

## 4. 测试与上线验收

在正式站点开始测试之前，通过浏览器控制台设置 `localStorage.setItem('suat:analytics-test', 'true')` 后刷新。随后 PostHog 事件均带 `is_test = true`，不要在 URL 中传测试参数。移除该键后恢复正常采集。不蒜子不支持这个测试过滤，正式站点测试仍可能增加它的累计数；优先在模拟环境测试。

- 初次访问、SPA 跳转、后退前进各计一次；只变 hash/query 不计新 PV。
- 检查实际请求内容，无查询参数、锚点、完整 referrer、自动点击事件、回放或人物属性。
- 三档反馈和四种原因关联正确；不选原因也能提交；同日刷新与跨标签页重复受限，北京时间跨日恢复。
- 测试离线、存储不可用、SDK 加载失败：阅读正常，反馈不显示服务器已确认成功。
- 关闭统计会持久化设置并刷新；后续访问和切页没有两套统计的新请求，反馈停用，首页显示“统计已关闭”；其他已打开标签页同步设置。重新开启恢复统计。
- 普通本地构建、部署预览和错误域名没有统计网络请求。
- 在校园实际网络验证 PostHog 与不蒜子加载、PostHog 入库，以及维护者后台可达性。

上线待办：创建账户与项目、设置生产变量、建立四块仪表板、校园网验收。未完成时不得将本地测试描述为已上线。

### 本地验收记录（2026-10-10）

使用 Chromium 将正式域名请求映射到本地生产构建，使用假项目令牌并拦截统计请求，未向真实 PostHog 项目写入数据。已检查：

- 页面初次访问和站内跳转各产生一个 PV，匿名访客标识保持一致；锚点跳转不新增事件；查询参数和锚点未出现在实际事件载荷。
- 三档反馈、选填原因及 `none` 值正确关联文章；刷新后已反馈状态保留；两个标签页同时提交只产生一次反馈。
- 模拟北京时间午夜，上一日反馈限制解除；离线或反馈存储写入失败不占用每日额度。
- 模拟 503 后退出，待重试请求不再发送；其他标签页同步退出，继续切页也没有两套统计的新请求；重新开启恢复采集。
- 普通本地构建和禁止读取统计偏好的浏览器不加载统计；390px 宽度下反馈区无横向溢出；贡献者署名仍显示。
- 类型检查、生产构建及两轴代码审查通过。仪表板实际查询、生产环境配置和校园网验收仍待完成。

## 参考

- [PostHog JS 配置](https://posthog.com/docs/libraries/js/config)
- [PostHog 套餐及保留规则](https://posthog.com/pricing)
- [事件属性拆分](https://posthog.com/docs/product-analytics/trends/breakdowns)
- [Docusaurus 客户端生命周期](https://docusaurus.io/docs/advanced/client)
