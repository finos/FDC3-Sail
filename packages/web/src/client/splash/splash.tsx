import { Popup } from "../popups/popup"
import styles from "./styles.module.css"

const REPO_URL = "https://github.com/finos/FDC3-Sail"
const GUIDE_URL = "https://github.com/finos/FDC3-Sail/blob/main/GUIDE.md"
const FAQ_URL = "https://github.com/finos/FDC3-Sail/blob/main/FAQ.md"

export const SplashScreen = ({ closeAction }: { closeAction: () => void }) => {
  return (
    <Popup
      key="SplashScreenPopup"
      title="Welcome to FDC3 Sail"
      area={
        <div className={styles.splashContent}>
          <div className={styles.splashLogo}>
            <img
              src="/icons/logo/logo.svg"
              className={styles.splashLogoImage}
              alt="FDC3 Sail logo"
            />
            <p className={styles.splashTitle}>FDC3 Sail</p>
          </div>
          <p className={styles.splashText}>
            FDC3 Sail is a browser-based desktop agent for launching and
            managing FDC3 apps in tabs and panels.
          </p>
          <div className={styles.linksRow}>
            <a
              className={styles.repoLink}
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
            >
              GitHub Repository
            </a>
            <a
              className={styles.repoLink}
              href={GUIDE_URL}
              target="_blank"
              rel="noreferrer"
            >
              User Guide
            </a>
            <a
              className={styles.repoLink}
              href={FAQ_URL}
              target="_blank"
              rel="noreferrer"
            >
              FAQ
            </a>
            <a
              className={styles.repoLink}
              href="https://fdc3.finos.org/"
              target="_blank"
              rel="noreferrer"
            >
              About FDC3
            </a>
          </div>
        </div>
      }
      buttons={[]}
      closeAction={closeAction}
      closeName="Close"
    />
  )
}
