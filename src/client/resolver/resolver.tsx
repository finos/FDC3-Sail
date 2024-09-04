import * as styles from "./styles.module.css";
import { Popup, PopupButton } from "../popups/popup";
import { AppIdentifier, AppIntent, Context } from "@kite9/fdc3";
import { ClientState } from "../state/client";
import { useState } from "react";

export const EXAMPLE_CONTEXT = {
  type: "fdc3.instrument",
  id: {
    ticker: "AAPL",
  },
  name: "APPLE INC",
};

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
];

type State = {
  newApps: boolean;
  chosenIntent: string | null;
  chosenApp: AppIdentifier | null;
};

const LineItemComponent = ({
  li,
  text,
  setState,
  isSelected,
}: {
  li: any;
  text: string;
  setState: (a: any) => void;
  isSelected: (a: any) => boolean;
}) => {
  return (
    <div
      className={`${styles.lineItem} ${isSelected(li) ? styles.highlightedLineItem : ""}`}
      onClick={() => {
        console.log("Setting state to ", li);
        setState(li);
      }}
    >
      {text}
    </div>
  );
};

function relevantApps(a: AppIntent, newApps: boolean): AppIntent | null {
  const out = {
    intent: a.intent,
    apps: a.apps.filter((x) => (newApps ? !x.instanceId : x.instanceId)),
  };

  if (out.apps.length == 0) {
    return null;
  } else {
    return out;
  }
}

export const ResolverPanel = ({
  cs,
  context,
  appIntents,
  closeAction,
}: {
  cs: ClientState;
  context: Context;
  appIntents: AppIntent[];
  closeAction: () => void;
}) => {
  const [state, setState]: [State, (x: State) => void] = useState({
    newApps: false,
    chosenApp: null,
    chosenIntent: null,
  } as State);

  const uniqueIntents = appIntents
    .filter((a) => relevantApps(a, state.newApps) != null)
    .map((a) => a.intent.name)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  return (
    <Popup
      key="Intent Resolver"
      title={`Where do you want to send this ${context.type}?`}
      area={
        <div className={styles.resolverContainer}>
          <div className={styles.resolverChoiceContainer}>
            <div
              className={` ${styles.choiceBox} ${state.newApps ? "" : styles.highlightedChoiceBox}`}
              onClick={() => {
                if (state.newApps) {
                  setState({
                    chosenApp: null,
                    chosenIntent: null,
                    newApps: false,
                  });
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
                    chosenApp: null,
                    chosenIntent: null,
                    newApps: true,
                  });
                }
              }}
            >
              Open A New App
            </div>
          </div>
          <div className={styles.resolverPanesContainer}>
            <div className={styles.resolverPane}>
              {uniqueIntents.map((i) => (
                <LineItemComponent
                  li={i}
                  text={i}
                  setState={(a) => {
                    if (state.chosenIntent != i) {
                      setState({
                        newApps: state.newApps,
                        chosenIntent: a,
                        chosenApp: null,
                      });
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
          text="Go"
          disabled={state.chosenApp == null || state.chosenIntent == null}
          onClick={async () => {
            if (state.chosenApp && state.chosenIntent) {
              alert("Do it");
            }
          }}
        />,
      ]}
      closeAction={() => closeAction()}
    />
  );
};
