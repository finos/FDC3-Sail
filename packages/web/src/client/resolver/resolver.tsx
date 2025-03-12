import styles from "./styles.module.css"
import { Popup, PopupButton } from "../popups/popup"
import { AppIdentifier, AppIntent, Context, Intent } from "@finos/fdc3"
import { useState } from "react"
import {
  AppPanel,
  AugmentedAppIntent,
  AugmentedAppMetadata,
  TabDetail,
} from "@finos/fdc3-sail-common"
import { DirectoryApp } from "@finos/fdc3-web-impl"
import { selectHighestContrast } from "../../util/contrast"
import { DEFAULT_ICON, getIcon } from "../appd/appd"

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
  li: string | Intent | AppIdentifier | TabDetail
  text: string
  icon: string
  background: string | null
  setState: (a: string | Intent | AppIdentifier | TabDetail) => void
  isSelected: (a: string | Intent | AppIdentifier | TabDetail) => boolean
}) => {
  const selected = isSelected(li)
  const lightBackground = background ? background + "44" : undefined

  return (
    <div
      className={`${styles.lineItem} ${selected ? styles.highlightedLineItem : null}`}
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
      <img
        src={icon}
        alt={text}
        className={styles.lineItemIcon}
        onError={(x) => ((x.target as HTMLImageElement).src = DEFAULT_ICON)}
      />
      <div className={styles.lineItemText}>{text}</div>
    </div>
  )
}

function getFirstIcon(a: AugmentedAppMetadata): string {
  return getIcon(a)
}

function relevantApps(
  a: AugmentedAppIntent,
  newApps: boolean,
  currentChannel: string | null,
): AugmentedAppIntent | null {
  const out: AugmentedAppIntent = {
    intent: a.intent,
    apps: a.apps
      .filter((x) => (newApps ? !x.instanceId : x.instanceId))
      .filter((x) => {
        if (!newApps) {
          // only show apps that are in the current channel
          return x.channel === currentChannel
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
  appIntents: AugmentedAppIntent[],
  intent: string,
  newApps: boolean,
  currentChannel: string | null,
): AppIdentifier | null {
  const relevant = appIntents
    .filter((a) => a.intent.name === intent)
    .map((a) => relevantApps(a, newApps, currentChannel))
    .filter((a) => a != null)
    .flatMap((a) => a?.apps)

  if (relevant.length == 0) {
    return null
  } else {
    return relevant[0]
  }
}

function getAppTitle(app: AugmentedAppMetadata): string {
  return app.instanceTitle ?? `New ${app.title}`
}

function generateUniqueExistingAppIntents(
  appIntents: AugmentedAppIntent[],
  currentChannel: string | null,
): Intent[] {
  return appIntents
    .filter((a) => relevantApps(a, false, currentChannel) != null)
    .map((a) => a.intent.name)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
}

function generateUniqueNewAppIntents(
  appIntents: AppIntent[],
  currentChannel: string | null,
): Intent[] {
  return appIntents
    .filter((a) => relevantApps(a, true, currentChannel) != null)
    .map((a) => a.intent.name)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()
}

function generateStartState(
  appIntents: AugmentedAppIntent[],
  currentChannel: string | null,
): State {
  const uniqueExistingAppIntents = generateUniqueExistingAppIntents(
    appIntents,
    currentChannel,
  )
  const uniqueNewAppIntents = generateUniqueNewAppIntents(
    appIntents,
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
  channelDetails,
  currentChannel,
  closeAction,
  chooseAction,
}: {
  context: Context
  appIntents: AugmentedAppIntent[]
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
    generateStartState(appIntents, currentChannel),
  )

  const uniqueExistingAppIntents = generateUniqueExistingAppIntents(
    appIntents,
    state.channelId,
  )

  const uniqueNewAppIntents = generateUniqueNewAppIntents(
    appIntents,
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
                  setState={() => {
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
                setState={() => {
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
                        chosenIntent: a as string,
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
                .map((ai) => relevantApps(ai, state.newApps, state.channelId))
                .filter((a) => a != null)
                .flatMap((a) => a?.apps)
                .map((i) => (
                  <LineItemComponent
                    key={i.appId + i.instanceId}
                    li={i}
                    text={getAppTitle(i)}
                    icon={getFirstIcon(i)}
                    background={null}
                    setState={(a) =>
                      setState({ ...state, chosenApp: a as AppIdentifier })
                    }
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
        chooseAction(null, null, null)
        closeAction()
      }}
      closeName="Cancel"
    />
  )
}
