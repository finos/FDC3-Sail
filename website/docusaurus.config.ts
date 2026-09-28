import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

const config: Config = {
  title: "FDC3 Sail",
  tagline: "Open-source FDC3 2.2 Desktop Agent for the browser and desktop",
  favicon: "img/logo.svg",

  future: {
    v4: true,
  },

  // Set the production url of your site here
  url: "https://finos.github.io",
  baseUrl: "/FDC3-Sail/",

  // GitHub pages deployment config
  organizationName: "finos",
  projectName: "FDC3-Sail",

  onBrokenLinks: "throw",

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  themes: ["@docusaurus/theme-mermaid"],

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/finos/FDC3-Sail/tree/main/website/",
        },
        blog: false, // Disable blog for now
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/fdc3-sail-social-card.jpg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "FDC3 Sail",
      logo: {
        alt: "FDC3 Sail Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/finos/FDC3-Sail",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/docs/getting-started",
            },
            {
              label: "Architecture",
              to: "/docs/architecture/overview",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "FINOS",
              href: "https://www.finos.org/",
            },
            {
              label: "FDC3 Standard",
              href: "https://fdc3.finos.org/",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/finos/FDC3-Sail",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} FINOS - The Fintech Open Source Foundation. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "typescript", "json"],
    },
  } satisfies Preset.ThemeConfig,
}

export default config
