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
            title="FDC3 2.2 Compliant"
            description="Full implementation of the FDC3 2.2 interoperability standard, including the new For-The-Web APIs."
          />
          <Feature
            title="Browser-native"
            description="Run FDC3 applications in your browser — installable as a PWA, no native install required."
          />
          <Feature
            title="Open Source"
            description="Fully open-source under the Apache 2.0 license. Contribute and help shape the future of financial desktop interoperability."
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
      description="Open-source FDC3 2.2 Desktop Agent for the browser and desktop"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  )
}
