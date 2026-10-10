import React, { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import {
  feedbackAvailable, isProductionSite, setStatisticsEnabled, statisticsDisabled,
} from "../analytics";

export default function Privacy() {
  const [ready, setReady] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setDisabled(statisticsDisabled());
    setReady(true);
  }, []);

  return (
    <Layout title="统计说明与设置" description="了解手册的访问统计、文章反馈与关闭统计的方式。">
      <main className="container margin-vert--lg" style={{ maxWidth: "52rem" }}>
        <h1>统计说明与设置</h1>
        <p>我们用访问统计判断哪些内容值得优先维护，用文章反馈了解哪些内容需要改进。</p>

        <h2>当前浏览器的选择</h2>
        <p aria-live="polite">{!ready ? "正在读取设置…" : disabled
          ? "统计已关闭，文章反馈也已停用。"
          : "当前允许本站统计。"}</p>
        {ready && !isProductionSite() && <p>当前不是正式生产站点，不会加载两套统计服务。</p>}
        {ready && isProductionSite() && !disabled && !feedbackAvailable() &&
          <p>PostHog 与文章反馈尚未配置启用；首页不蒜子统计独立运行。</p>}
        <button type="button" className="button button--primary" disabled={!ready}
          onClick={() => {
            if (!setStatisticsEnabled(disabled)) {
              setError("无法保存设置，请允许浏览器使用本站本地存储后重试。");
            }
          }}>
          {disabled ? "重新开启本站统计" : "关闭本站统计"}
        </button>
        {error && <p role="alert">{error}</p>}
        <p className="margin-top--md">设置仅保存在当前浏览器，修改后会刷新页面。关闭后停止两套服务的后续采集和文章反馈；首页显示“统计已关闭”。此前已发送的数据不会自动删除，已经发出的请求无法撤回。清除浏览器存储或换设备后需要重新设置。</p>

        <h2>PostHog：内部内容分析</h2>
        <p>配置启用后，我们记录页面访问，以及你主动提交的“有帮助／部分有帮助／没帮助”和可选原因。页面事件使用路径和标题，不携带地址中的查询参数或锚点。不启用自动点击、会话回放、异常或性能采集。</p>
        <p>浏览器本地存储中的随机标识用于估算访客数，可关联同一浏览器的多次访问；它不关联姓名、学号或账号，不同设备可能被重复计算。反馈日期也保存在本地，用于限制同一文章北京时间每天反馈一次。</p>
        <p>使用 PostHog Cloud 不绑卡免费账户，当前方案的数据保留期为一年；服务条款或套餐变化时会相应更新说明。第三方接收请求时仍能接触 IP 等网络信息；我们关闭了 SDK 的 IP 地理定位处理，并未承诺网络层完全匿名。</p>
        <p>事件传输可能受网络或拦截插件影响。“今天已记录你的选择”指浏览器已经记录本次反馈并交给统计 SDK，不保证服务器已收到。</p>
        <p><a href="https://posthog.com/privacy">PostHog 隐私政策</a> · <a href="https://posthog.com/pricing">当前套餐说明</a></p>

        <h2>不蒜子：首页累计数字</h2>
        <p>我们保留不蒜子提供的累计访客数和浏览次数。该第三方脚本会在首次访问和站内切换页面时加载，文档页也会触发；隐藏数字本身并不等于停止采集。</p>
        <p>它与 PostHog 的统计口径不同，两套数字不合并。不蒜子脚本的具体采集、存储及保留规则由服务提供方决定，我们尚未核实完整保留政策，不能将 PostHog 的一年期限套用到不蒜子。你可以通过上方开关同时关闭两者。</p>
        <p><a href="https://busuanzi.ibruce.info/">不蒜子服务说明</a></p>
      </main>
    </Layout>
  );
}
