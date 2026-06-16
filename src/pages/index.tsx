import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

const categories = [
  {
    title: "🏃 办事指南",
    description: "校园卡、电费、快递、打印……在校常用办事一览",
    to: "/docs/办事指南",
  },
  {
    title: "🍜 校园生活",
    description: "食堂、快递、社团、心理资源、校医院，真实的校园日常",
    to: "/docs/校园生活",
  },
  {
    title: "📚 学业指南",
    description: "专业分流、科研轮转、联合培养，学业路上少走弯路",
    to: "/docs/学业指南",
  },
  {
    title: "🎓 新生专区",
    description: "报到流程、宿舍、第一周清单……暑假前必读",
    to: "/docs/新生指南",
  },
];

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/深理工手册"
          >
            开始探索 →
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <section className="container" style={{ padding: "3rem 0" }}>
          <div className="row">
            {categories.map(({ title, description, to }) => (
              <div key={title} className="col col--3">
                <div
                  className="card"
                  style={{ height: "100%", padding: "1.5rem" }}
                >
                  <Heading as="h3">{title}</Heading>
                  <p style={{ color: "var(--ifm-color-emphasis-700)" }}>
                    {description}
                  </p>
                  <Link to={to}>查看 →</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div
          id="site-stats"
          style={{
            textAlign: "center",
            padding: "1rem 0 2rem",
            color: "var(--ifm-color-emphasis-500)",
            fontSize: "0.85rem",
          }}
        >
          累计访客 <span id="busuanzi_value_site_uv">...</span> 人 &nbsp;·&nbsp;
          累计浏览 <span id="busuanzi_value_site_pv">...</span> 次
        </div>
      </main>
    </Layout>
  );
}
