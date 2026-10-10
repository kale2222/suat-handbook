import React, { useEffect, useState } from "react";
import { isProductionSite, statisticsDisabled } from "../analytics";

export default function VisitorCounters() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (statisticsDisabled()) setMessage("统计已关闭");
    else if (!isProductionSite()) setMessage("非生产环境不采集访问统计");
  }, []);

  return (
    <div id="site-stats" style={{
      textAlign: "center", padding: "1rem 0 2rem",
      color: "var(--ifm-color-emphasis-700)", fontSize: "0.85rem",
    }}>
      {message || <>
        累计访客 <span id="busuanzi_value_site_uv">...</span> 人 &nbsp;·&nbsp;
        累计浏览 <span id="busuanzi_value_site_pv">...</span> 次
      </>}
    </div>
  );
}
