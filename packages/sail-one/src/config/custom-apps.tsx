import { getClientState } from "../state"
import styles from "./styles.module.css"
import type { DirectoryApp, WebAppDetails } from "@finos/sail-browser-agent"
import { DeleteButton } from "./delete-button"
import { AddButton } from "./add-button"
import Combobox from "react-widgets/Combobox"
import Multiselect from "react-widgets/Multiselect"
import "react-widgets/styles.css"
import { useState } from "react"
import {
  CONTEXT_TYPES,
  getAllContextTypes,
  getAllIntentNames,
  intentTypes,
} from "./custom-apps-helpers"

type EditableIntent = {
  name: string
  contexts: string[]
}

type AppType = "web" | "native"

type EditableState = {
  id: string
  title: string
  type: AppType
  url: string
  description: string
  intents: EditableIntent[]
}

function newApp(): EditableState {
  return {
    id: "app-id" + crypto.randomUUID(),
    title: "New App",
    type: "web",
    url: "https://your.app.url/here",
    description: "Describe your app here",
    intents: [
      {
        name: "SomeIntent",
        contexts: ["fdc3.instrument"],
      },
    ],
  }
}

function createInitialState(): EditableState[] {
  return getClientState()
    .getCustomApps()
    .map(a => {
      const lf = a.interop?.intents?.listensFor ?? {}
      return {
        id: a.appId,
        type: a.type === "native" ? "native" : "web",
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: getCustomApps() reads back custom-apps saved to localStorage, whose shape can predate the current WebAppDetails type
        url: (a.details as WebAppDetails)?.url ?? "",
        title: a.title,
        description: a.description ?? "",
        intents: Object.keys(lf).map(k => {
          const val = lf[k] ?? { contexts: [] }
          return {
            name: k,
            contexts: val.contexts,
          }
        }),
      }
    })
}

function convertToDirectoryApps(es: EditableState[]): DirectoryApp[] {
  return es.map(s => {
    return {
      appId: s.id,
      title: s.title,
      name: s.title,
      details: s.type === "web" ? { url: s.url } : { path: "" },
      type: s.type,
      description: s.description,
      icons: [{ src: "/icons/control/choose-app.svg" }],
      screenshots: [{ src: "/images/screenshot.webp" }],
      version: "1.0.0",
      publisher: "FINOS",
      interop: {
        intents: {
          listensFor: Object.fromEntries(
            s.intents.map(i => [
              i.name,
              {
                displayName: i.name,
                contexts: i.contexts,
              },
            ]),
          ),
        },
      },
    }
  })
}

const IntentPicker = ({ name, update }: { name: string; update: (x: string) => void }) => {
  return (
    <label className={styles.settingsField}>
      <span className={styles.settingsFieldLabel}>Intent</span>
      <div className={styles.settingsWidget}>
        <Combobox hideEmptyPopup data={getAllIntentNames()} value={name} onChange={update} />
      </div>
    </label>
  )
}

const ContextPicker = ({
  contextTypes,
  update,
}: {
  contextTypes: string[]
  update: (x: string[]) => void
}) => {
  return (
    <label className={styles.settingsField}>
      <span className={styles.settingsFieldLabel}>Contexts</span>
      <div className={styles.settingsWidget}>
        <Multiselect
          defaultValue={["fdc3.instrument"]}
          value={contextTypes}
          data={getAllContextTypes()}
          allowCreate="onFilter"
          onChange={update}
          onCreate={n => {
            update([...contextTypes, n])
          }}
        />
      </div>
    </label>
  )
}

const IntentItem = ({
  ei,
  update,
}: {
  ei: EditableIntent
  update: (ei: EditableIntent | null) => void
}) => {
  return (
    <div className={styles.intentCard}>
      <div className={styles.intentRow}>
        <IntentPicker
          name={ei.name}
          update={x => {
            update({ ...ei, name: x })
          }}
        />

        <ContextPicker
          contextTypes={ei.contexts}
          update={x => {
            update({ ...ei, contexts: x })
          }}
        />
      </div>
      <DeleteButton onClick={() => update(null)} title="Remove this intent" compact />
    </div>
  )
}

const InteropList = ({
  app,
  update,
}: {
  app: EditableState
  update: (d: EditableState) => void
}) => {
  return (
    <div className={styles.settingsSection}>
      <p className={styles.settingsSectionTitle}>Intents I listen to</p>
      <div className={styles.intentList}>
        {app.intents.map((e, i) => (
          <IntentItem
            key={`${e.name}-${i}`}
            ei={e}
            update={(ei: EditableIntent | null) => {
              if (ei) {
                const newState = { ...app, intents: [...app.intents] }
                newState.intents[i] = ei
                update(newState)
              } else {
                const newIntents = [...app.intents]
                newIntents.splice(i, 1)
                update({ ...app, intents: newIntents })
              }
            }}
          />
        ))}
      </div>

      <AddButton
        label="Add intent"
        compact
        onClick={() => {
          update({
            ...app,
            intents: [
              ...app.intents,
              {
                name: intentTypes[0]!.title,
                contexts: [CONTEXT_TYPES[0]!],
              },
            ],
          })
        }}
      />
    </div>
  )
}

const CustomAppItem = ({
  d,
  update,
}: {
  d: EditableState
  update: (d: EditableState | null) => void
}) => {
  return (
    <article className={`${styles.settingsCard} ${styles.appCard}`}>
      <div className={styles.settingsFields}>
        <div className={styles.appTitleRow}>
          <label className={styles.settingsField}>
            <span className={styles.settingsFieldLabel}>Title</span>
            <input
              type="text"
              className={styles.settingsInput}
              value={d.title}
              placeholder="App title"
              onChange={e => update({ ...d, title: e.target.value })}
            />
          </label>
          <DeleteButton onClick={() => update(null)} title="Remove this app" />
        </div>
        <label className={styles.settingsField}>
          <span className={styles.settingsFieldLabel}>Description</span>
          <input
            type="text"
            className={styles.settingsInput}
            value={d.description}
            placeholder="App description"
            onChange={e => update({ ...d, description: e.target.value })}
          />
        </label>
        <div className={styles.appMetaRow}>
          <label className={styles.settingsField}>
            <span className={styles.settingsFieldLabel}>Type</span>
            <select
              className={styles.settingsSelect}
              value={d.type}
              onChange={e => update({ ...d, type: e.target.value as AppType })}
            >
              <option value="web">Web</option>
              <option value="native">Native</option>
            </select>
          </label>
          <label className={styles.settingsField}>
            <span className={styles.settingsFieldLabel}>URL</span>
            <input
              type="url"
              className={styles.settingsInput}
              value={d.url}
              placeholder="https://your.app.url/here"
              disabled={d.type === "native"}
              onChange={e => update({ ...d, url: e.target.value })}
            />
          </label>
        </div>
      </div>

      <InteropList app={d} update={update} />
    </article>
  )
}

export const CustomAppList = () => {
  const [apps, setApps] = useState<EditableState[]>(createInitialState())

  async function updateApps(newApps: EditableState[]): Promise<void> {
    setApps(newApps)
    return getClientState().setCustomApps(convertToDirectoryApps(newApps))
  }

  return (
    <div className={styles.settingsList}>
      {apps.length === 0 ? (
        <p className={styles.settingsEmpty}>
          No custom apps yet. Add one to include it in the App Launcher.
        </p>
      ) : (
        apps.map(d => (
          <CustomAppItem
            key={d.id}
            d={d}
            update={app => {
              if (app) {
                const idx = apps.findIndex(a => a.id == d.id)
                const newApps = [...apps]
                newApps[idx] = app
                void updateApps(newApps)
              } else {
                void updateApps(apps.filter(a => a.id !== d.id))
              }
            }}
          />
        ))
      )}
      <AddButton label="Add custom app" onClick={() => void updateApps([...apps, newApp()])} />
    </div>
  )
}
