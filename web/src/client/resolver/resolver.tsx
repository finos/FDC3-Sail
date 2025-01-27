import * as styles from "./styles.module.css"
import { Popup, PopupButton } from "../popups/popup"
import { AppIdentifier, AppIntent, Context } from "@finos/fdc3"
import { useState } from "react"

export const EXAMPLE_CONTEXT = {
  type: "fdc3.instrument",
  id: {
    ticker: "AAPL",
  },
  name: "APPLE INC",
}

export const EXAMPLE_APP_INTENTS: AppIntent[] = [
  {
    intent: {
      name: "ViewChart",
    },
    apps: [
      {
        appId: "app1",
      },
      {
        appId: "app2",
      },
    ],
  },
  {
    intent: {
      name: "ViewNews",
    },
    apps: [
      {
        appId: "app1",
      },
      {
        appId: "app2",
      },
      {
        appId: "app3",
      },
      {
        appId: "app3",
        instanceId: "23483",
      },
    ],
  },
]

type State = {
  newApps: boolean
  chosenIntent: string | null
  chosenApp: AppIdentifier | null
}

const LineItemComponent = ({
  li,
  text,
  setState,
  isSelected,
}: {
  li: any
  text: string
  setState: (a: any) => void
  isSelected: (a: any) => boolean
}) => {
  return (
    <div
      className={`${styles.lineItem} ${isSelected(li) ? styles.highlightedLineItem : ""}`}
      onClick={() => {
        console.log("Setting state to ", li)
        setState(li)
      }}
    >
      {text}
    </div>
  )
}

function relevantApps(a: AppIntent, newApps: boolean): AppIntent | null {
  const out = {
    intent: a.intent,
    apps: a.apps.filter((x) => (newApps ? !x.instanceId : x.instanceId)),
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
): AppIdentifier | null {
  const relevant = appIntents
    .filter((a) => a.intent.name === intent)
    .map((a) => relevantApps(a, newApps))
    .filter((a) => a != null)
    .flatMap((a) => a?.apps)

  if (relevant.length == 0) {
    return null
  } else {
    return relevant[0]
  }
}

export const ResolverPanel = ({
  context,
  appIntents,
  closeAction,
  chooseAction,
}: {
  context: Context
  appIntents: AppIntent[]
  closeAction: () => void
  chooseAction: (
    chosenApp: AppIdentifier | null,
    chosenIntent: string | null,
  ) => void
}) => {
  const uniqueExistingAppIntents = appIntents
    .filter((a) => relevantApps(a, false) != null)
    .map((a) => a.intent.name)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()

  const uniqueNewAppIntents = appIntents
    .filter((a) => relevantApps(a, true) != null)
    .map((a) => a.intent.name)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()

  const startState: State =
    uniqueExistingAppIntents.length > 0
      ? {
          newApps: false,
          chosenApp: firstApp(appIntents, uniqueExistingAppIntents[0], false),
          chosenIntent: uniqueExistingAppIntents[0],
        }
      : {
          newApps: true,
          chosenApp: firstApp(appIntents, uniqueNewAppIntents[0], true),
          chosenIntent: uniqueNewAppIntents[0],
        }

  const [state, setState]: [State, (x: State) => void] = useState(startState)

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
            <div
              className={` ${styles.choiceBox} ${state.newApps ? "" : styles.highlightedChoiceBox} ${uniqueExistingAppIntents.length > 0 ? styles.activeChoiceBox : styles.inactiveChoiceBox}`}
              onClick={() => {
                if (state.newApps && uniqueExistingAppIntents.length > 0) {
                  setState({
                    chosenApp: null,
                    chosenIntent: state.chosenIntent,
                    newApps: false,
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
                  })
                }
              }}
            >
              Open A New App
            </div>
          </div>
          <div className={styles.resolverPanesContainer}>
            <div className={styles.resolverPane}>
              {intentsToUse.map((i) => (
                <LineItemComponent
                  key={i}
                  li={i}
                  text={i}
                  setState={(a) => {
                    if (state.chosenIntent != i) {
                      setState({
                        newApps: state.newApps,
                        chosenIntent: a,
                        chosenApp: null,
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
                .map((ai) => relevantApps(ai, state.newApps))
                .filter((a) => a != null)
                .flatMap((a) => a?.apps)
                .map((i) => (
                  <LineItemComponent
                    key={i.appId + i.instanceId}
                    li={i}
                    text={i.appId + (i.instanceId ? ` (${i.instanceId})` : "")}
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
              chooseAction(state.chosenApp, state.chosenIntent)
              closeAction()
            }
          }}
        />,
      ]}
      closeAction={() => {
        chooseAction(null, null)
        closeAction()
      }}
      closeName="Cancel"
    />
  )
}
