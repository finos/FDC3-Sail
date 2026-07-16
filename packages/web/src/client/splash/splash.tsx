import { Popup } from "../popups/popup"
import { CSSProperties } from "react"
const REPO_URL = "https://github.com/finos/FDC3-Sail"
const GUIDE_URL = "https://github.com/finos/FDC3-Sail/blob/main/GUIDE.md"
const FAQ_URL = "https://github.com/finos/FDC3-Sail/blob/main/FAQ.md"
const splashContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  textAlign: "center",
  color: "#111",
}
const splashLogoStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  alignItems: "center",
}
const splashLogoImageStyle: CSSProperties = {
  width: "6rem",
  height: "6rem",
}
const splashTitleStyle: CSSProperties = {
  fontSize: "2rem",
  fontWeight: 600,
  margin: 0,
}
const splashTextStyle: CSSProperties = {
  maxWidth: "36rem",
  margin: 0,
  lineHeight: 1.5,
}
const repoLabelStyle: CSSProperties = {
  margin: 0,
  fontWeight: 600,
}
const repoLinkStyle: CSSProperties = {
  color: "#0a66c2",
  fontWeight: 500,
}
const linksRowStyle: CSSProperties = {
  display: "flex",
  gap: "1.5rem",
  justifyContent: "center",
}
export const SplashScreen = ({ closeAction }: { closeAction: () => void }) => {
  return (
    <Popup
      key="SplashScreenPopup"
      title="Welcome to FDC3 Sail"
      area={
        <div style={splashContentStyle}>
          <div style={splashLogoStyle}>
            <img
              src="/icons/logo/logo.svg"
              style={splashLogoImageStyle}
              alt="FDC3 Sail logo"
            />
            <p style={splashTitleStyle}>FDC3 Sail</p>
          </div>
          <p style={splashTextStyle}>
            FDC3 Sail is a browser-based desktop agent for launching and
            managing FDC3 apps in tabs and panels.
          </p>
          <p style={repoLabelStyle}>GitHub repository</p>
          
            style={repoLinkStyle}
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            {REPO_URL}
          </a>
          <div style={linksRowStyle}>
            
              style={repoLinkStyle}
              href={GUIDE_URL}
              target="_blank"
              rel="noreferrer"
            >
              User Guide
            </a>
            
              style={repoLinkStyle}
              href={FAQ_URL}
              target="_blank"
              rel="noreferrer"
            >
              FAQ
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
