import type { ReactNode } from "react"
import clsx from "clsx"
import Link from "@docusaurus/Link"
import useBaseUrl from "@docusaurus/useBaseUrl"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import Layout from "@theme/Layout"
import Heading from "@theme/Heading"

import styles from "./index.module.css"

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  const sailIconUrl = useBaseUrl("/img/sail-icon.svg")

  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className="container">
        <img
          src={sailIconUrl}
          alt="FDC3 Sail"
          className={styles.heroLogo}
          width={120}
          height={175}
        />
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/">
            Get Started
          </Link>
          <Link className="button button--outline button--lg" to="/docs/packages/overview">
            Packages
          </Link>
        </div>
      </div>
    </header>
  )
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  )
}

function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <Feature
            title="FDC3 2.2 and 3.0"
            description="Browser-resident Desktop Agent with WCP and DACP. Each app negotiates its wire version; Sail serves matching handlers for 2.2 and 3.0."
          />
          <Feature
            title="Browser-native"
            description="Host FDC3 apps in the browser — compose the agent into your shell, or run Sail's example workspaces. Installable as a PWA."
          />
          <Feature
            title="Open Source"
            description="Apache 2.0 under FINOS. Engine, browser host, example shells, and conformance harness — contribute and shape desktop interoperability."
          />
        </div>
      </div>
    </section>
  )
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Home"
      description="Open-source FDC3 Desktop Agent for the browser — FDC3 2.2 and 3.0 (WCP + DACP)"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  )
}
