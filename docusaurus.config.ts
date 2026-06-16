import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "SUAT 手册",
  tagline:
    "欢迎使用SUAT手册!  这是一份关于深理工校内生活，学习方面的百科全书，持续更新，欢迎收藏。",
  favicon: "img/logo.png",

  clientModules: ["./src/busuanzi.ts"],

  future: {
    v4: false,
  },

  url: "https://suat-handbook.netlify.app/",
  baseUrl: "/",

  organizationName: "kale2222",
  projectName: "suat-handbook",

  onBrokenLinks: "throw",

  i18n: {
    defaultLocale: "zh-Hans",
    locales: ["zh-Hans"],
  },

  plugins: [
    [
      "@docusaurus/plugin-ideal-image",
      {
        quality: 80,
        max: 1200,
        min: 600,
        steps: 2,
        disableInDev: false,
      },
    ],
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/kale2222/suat-handbook/tree/main/",
          showLastUpdateTime: true,
          showLastUpdateAuthor: false,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/docusaurus-social-card.jpg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "SUAT 手册",
      logo: {
        alt: "SUAT 手册",
        src: "img/logo.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "文档",
        },
        {
          href: "https://github.com/kale2222/suat-handbook",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "light",
      links: [],
      copyright: `开源共建 · ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
