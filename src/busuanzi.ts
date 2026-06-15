// 不蒜子统计（SPA 适配版）
// 每次路由切换重新注入脚本：修复客户端跳转到首页后计数停留 "..."，
// 同时补上 SPA 内部跳转漏计的 PV；超时未返回则隐藏统计行。
import type { ClientModule } from "@docusaurus/types";

const SCRIPT_SRC =
  "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
const TIMEOUT_MS = 5000;

function reloadBusuanzi() {
  // 移除旧 script 再注入，busuanzi 脚本每次加载都会重新拉取计数
  document
    .querySelectorAll("script[data-busuanzi]")
    .forEach((el) => el.remove());
  const script = document.createElement("script");
  script.src = SCRIPT_SRC;
  script.async = true;
  script.dataset.busuanzi = "true";
  document.head.appendChild(script);

  const stats = document.getElementById("site-stats");
  const uv = document.getElementById("busuanzi_value_site_uv");
  if (!stats || !uv) return;
  stats.style.removeProperty("visibility");
  window.setTimeout(() => {
    if (uv.textContent?.trim() === "...") {
      stats.style.visibility = "hidden";
    }
  }, TIMEOUT_MS);
}

const clientModule: ClientModule = {
  onRouteDidUpdate({ location, previousLocation }) {
    // 首次加载 previousLocation 为 null，也会触发；hash 变化不重复计数
    if (previousLocation && location.pathname === previousLocation.pathname) {
      return;
    }
    reloadBusuanzi();
  },
};

export default clientModule;
