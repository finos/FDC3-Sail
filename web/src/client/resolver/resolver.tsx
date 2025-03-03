import * as styles from "./styles.module.css"
import { Popup, PopupButton } from "../popups/popup"
import { AppIdentifier, AppIntent, Context, Intent } from "@finos/fdc3"
import { useState } from "react"
import { AppPanel, TabDetail } from "@finos/fdc3-sail-common"
import { DirectoryApp } from "@finos/fdc3-web-impl"
import { selectHighestContrast } from "../../util/contrast"

type State = {
  newApps: boolean
  chosenIntent: string | null
  chosenApp: AppIdentifier | null
  channelId: string | null
}

const LineItemComponent = ({
  li,
  text,
  icon,
  background,
  setState,
  isSelected,
}: {
  li: any
  text: string
  icon: string
  background: string | null
  setState: (a: any) => void
  isSelected: (a: any) => boolean
}) => {
  const selected = isSelected(li)
  const lightBackground = background ? background + "44" : null

  return (
    <div
      className={`${styles.lineItem} ${selected ? styles.highlightedLineItem : styles.inactiveLineItem}`}
      onClick={() => {
        setState(li)
      }}
      style={
        background
          ? {
              backgroundColor: selected ? background : lightBackground,
              color: selectHighestContrast(background, "#FFFFFF", "#DDDDDD"),
            }
          : {}
      }
    >
      <img src={icon} alt={text} className={styles.lineItemIcon} />
      <div className={styles.lineItemText}>{text}</div>
    </div>
  )
}

function getFirstIcon(appId: string, appDetails: DirectoryApp[]): string {
  const app = appDetails.find((a) => a.appId === appId)
  return app?.icons?.[0]?.src ?? ""
}

function relevantApps(
  a: AppIntent,
  newApps: boolean,
  panelDetails: AppPanel[],
  currentChannel: string | null,
): AppIntent | null {
  const out = {
    intent: a.intent,
    apps: a.apps
      .filter((x) => (newApps ? !x.instanceId : x.instanceId))
      .filter((x) => {
        if (!newApps) {
          // only show apps that are in the current channel
          const panel = panelDetails.find(
            (p) => p.appId === x.appId && p.panelId === x.instanceId,
          )
          return panel?.tabId === currentChannel
        } else {
          return true
        }
      }),
  }

  if (out.apps.length == 0) {
    return null
  } else {
    return out
  }
}

function firstApp(
  appIntents: AppIntent[],
  intent: string,
  newApps: boolean,
  panelDetails: AppPanel[],
  currentChannel: string | null,
): AppIdentifier | null {
  const relevant = appIntents
    .filter((a) => a.intent.name === intent)
    .map((a) => relevantApps(a, newApps, panelDetails, currentChannel))
    .filter((a) => a != null)
    .flatMap((a) => a?.apps)

  if (relevant.length == 0) {
    return null
  } else {
    return relevant[0]
  }
}

function getAppTitle(
  app: AppIdentifier,
  panelDetails: AppPanel[],
  appDetails: DirectoryApp[],
): string {
  const panel = panelDetails.find(
    (p) => p.appId === app.appId && p.panelId === app.instanceId,
  )

  const appTitle = appDetails.find((a) => a.appId === app.appId)?.title

  return panel?.title ?? `New ${appTitle}`
}

function generateUniqueExistingAppIntents(
  appIntents: AppIntent[],
  panelDetails: AppPanel[],
  currentChannel: string | null,
): Intent[] {
  return appIntents
    .filter((a) => relevantApps(a, false, panelDetails, currentChannel) != null)
    .map((a) => a.intent.name)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
}

function generateUniqueNewAppIntents(
  appIntents: AppIntent[],
  panelDetails: AppPanel[],
  currentChannel: string | null,
): Intent[] {
  return appIntents
    .filter((a) => relevantApps(a, true, panelDetails, currentChannel) != null)
    .map((a) => a.intent.name)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
}

function generateStartState(
  appIntents: AppIntent[],
  panelDetails: AppPanel[],
  currentChannel: string | null,
): State {
  const uniqueExistingAppIntents = generateUniqueExistingAppIntents(
    appIntents,
    panelDetails,
    currentChannel,
  )
  const uniqueNewAppIntents = generateUniqueNewAppIntents(
    appIntents,
    panelDetails,
    currentChannel,
  )

  const startState: State =
    uniqueExistingAppIntents.length > 0
      ? {
          newApps: false,
          chosenApp: firstApp(
            appIntents,
            uniqueExistingAppIntents[0],
            false,
            panelDetails,
            currentChannel,
          ),
          chosenIntent: uniqueExistingAppIntents[0],
          channelId: currentChannel,
        }
      : {
          newApps: true,
          chosenApp: firstApp(
            appIntents,
            uniqueNewAppIntents[0],
            true,
            panelDetails,
            currentChannel,
          ),
          chosenIntent: uniqueNewAppIntents[0],
          channelId: currentChannel,
        }
  return startState
}

export const ResolverPanel = ({
  context,
  appIntents,
  appDetails,
  channelDetails,
  panelDetails,
  currentChannel,
  closeAction,
  chooseAction,
}: {
  context: Context
  appIntents: AppIntent[]
  channelDetails: TabDetail[]
  panelDetails: AppPanel[]
  appDetails: DirectoryApp[]
  currentChannel: string | null
  closeAction: () => void
  chooseAction: (
    chosenApp: AppIdentifier | null,
    chosenIntent: string | null,
    chosenChannel: string | null,
  ) => void
}) => {
  const [state, setState]: [State, (x: State) => void] = useState(
    generateStartState(appIntents, panelDetails, currentChannel),
  )

  const uniqueExistingAppIntents = generateUniqueExistingAppIntents(
    appIntents,
    panelDetails,
    state.channelId,
  )

  const uniqueNewAppIntents = generateUniqueNewAppIntents(
    appIntents,
    panelDetails,
    state.channelId,
  )

  const intentsToUse = state.newApps
    ? uniqueNewAppIntents
    : uniqueExistingAppIntents

  return (
    <Popup
      key="Intent Resolver"
      title={`Where do you want to send this ${context.type}?`}
      area={
        <div className={styles.resolverContainer}>
          <div className={styles.resolverChoiceContainer}>
            <div className={styles.choiceBox}>Location</div>
            <div
              className={` ${styles.choiceBox} ${state.newApps ? "" : styles.highlightedChoiceBox} ${uniqueExistingAppIntents.length > 0 ? styles.activeChoiceBox : styles.inactiveChoiceBox}`}
              onClick={() => {
                if (state.newApps && uniqueExistingAppIntents.length > 0) {
                  setState({
                    chosenApp: null,
                    chosenIntent: state.chosenIntent,
                    newApps: false,
                    channelId: state.channelId,
                  })
                }
              }}
            >
              Use An Existing App
            </div>
            <div
              className={` ${styles.choiceBox} ${state.newApps ? styles.highlightedChoiceBox : ""}`}
              onClick={() => {
                if (!state.newApps) {
                  setState({
                    chosenIntent: state.chosenIntent,
                    chosenApp: null,
                    newApps: true,
                    channelId: state.channelId,
                  })
                }
              }}
            >
              Open A New App
            </div>
          </div>
          <div className={styles.resolverPanesContainer}>
            <div className={styles.resolverPane}>
              {channelDetails.map((c) => (
                <LineItemComponent
                  key={c.id}
                  li={c}
                  text={c.title}
                  background={c.background}
                  icon={c.icon}
                  setState={(a) => {
                    setState({
                      newApps: state.newApps,
                      chosenIntent: state.chosenIntent,
                      chosenApp: state.chosenApp,
                      channelId: c.id,
                    })
                  }}
                  isSelected={() => c.id === state.channelId}
                />
              ))}
              <LineItemComponent
                key={"no-channel"}
                li={"No Channel"}
                text={"New Tab"}
                background={null}
                icon={"/static/icons/logo/logo.svg"}
                setState={(a) => {
                  setState({
                    newApps: state.newApps,
                    chosenIntent: state.chosenIntent,
                    chosenApp: state.chosenApp,
                    channelId: null,
                  })
                }}
                isSelected={() => state.channelId === null}
              />
            </div>
            <div className={styles.resolverPane}>
              {intentsToUse.map((i) => (
                <LineItemComponent
                  key={i}
                  li={i}
                  icon={"/static/icons/control/intent.svg"}
                  background={null}
                  text={i}
                  setState={(a) => {
                    if (state.chosenIntent != i) {
                      setState({
                        newApps: state.newApps,
                        chosenIntent: a,
                        chosenApp: null,
                        channelId: state.channelId,
                      })
                    }
                  }}
                  isSelected={(a) => a === state.chosenIntent}
                />
              ))}
            </div>
            <div className={styles.resolverPane}>
              {appIntents
                .filter((a) => a.intent.name === state.chosenIntent)
                .map((ai) =>
                  relevantApps(
                    ai,
                    state.newApps,
                    panelDetails,
                    state.channelId,
                  ),
                )
                .filter((a) => a != null)
                .flatMap((a) => a?.apps)
                .map((i) => (
                  <LineItemComponent
                    key={i.appId + i.instanceId}
                    li={i}
                    text={getAppTitle(i, panelDetails, appDetails)}
                    icon={getFirstIcon(i.appId, appDetails)}
                    background={null}
                    setState={(a) => setState({ ...state, chosenApp: a })}
                    isSelected={(a) => a === state.chosenApp}
                  />
                ))}
            </div>
          </div>
        </div>
      }
      buttons={[
        <PopupButton
          key="go"
          text="Go"
          disabled={state.chosenApp == null || state.chosenIntent == null}
          onClick={async () => {
            if (state.chosenApp && state.chosenIntent) {
              chooseAction(state.chosenApp, state.chosenIntent, state.channelId)
              closeAction()
            }
          }}
        />,
      ]}
      closeAction={() => {
        chooseAction(null, null, null), closeAction()
      }}
      closeName="Cancel"
    />
  )
}
