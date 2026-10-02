import { getClientState, getServerState } from "@finos/fdc3-sail-common"
import styles from "./styles.module.css"
import { DirectoryApp, WebAppDetails } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from "uuid"
import { InlineButton } from "./shared"
import { intentTypes } from "./intentTypes"
import { CONTEXT_TYPES } from "./contextTypes"
import Combobox from "react-widgets/Combobox"
import Multiselect from "react-widgets/Multiselect"
import "react-widgets/styles.css"
import { useState } from "react"

function getAllContextTypes(): string[] {
  const allContexts = [...CONTEXT_TYPES]
  getClientState()
    .getKnownApps()
    .forEach((a) => {
      if (a.interop?.userChannels) {
        allContexts.concat(a.interop.userChannels.listensFor ?? [])
        allContexts.concat(a.interop.userChannels.broadcasts ?? [])
      }
      if (a.interop?.appChannels) {
        a.interop.appChannels.forEach((ac) => {
          allContexts.concat(ac.broadcasts ?? [])
          allContexts.concat(ac.listensFor ?? [])
        })
      }
      if (a.interop?.intents?.listensFor) {
        Object.values(a.interop.intents.listensFor).forEach((v) => {
          allContexts.concat(v.contexts)
        })
      }
      if (a.interop?.intents?.raises) {
        Object.values(a.interop.intents.raises).forEach((v) => {
          allContexts.concat(v)
        })
      }
    })

  const unique = [...new Set(allContexts)]
  return unique.sort()
}

function getAllIntentNames(): string[] {
  const allIntents = intentTypes.map((i) => i.title)

  getClientState()
    .getKnownApps()
    .forEach((a) => {
      if (a.interop?.intents?.listensFor) {
        allIntents.concat(Object.keys(a.interop.intents.listensFor) ?? [])
      }
      if (a.interop?.intents?.raises) {
        allIntents.concat(Object.keys(a.interop?.intents?.raises) ?? [])
      }
    })

  const unique = [...new Set(allIntents)]
  return unique.sort()
}

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
    id: "app-id" + uuid(),
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
    .map((a) => {
      const lf = a.interop?.intents?.listensFor ?? {}
      return {
        id: a.appId,
        type: (a.type === "native" ? "native" : "web") as AppType,
        url: (a.details as WebAppDetails)?.url ?? "",
        title: a.title,
        description: a.description ?? "",
        intents: Object.keys(lf).map((k) => {
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
  return es.map((s) => {
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
            s.intents.map((i) => [
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

const AddButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.add} onClick={onClick}>
      <p>Click to Add A New Custom App</p>
    </div>
  )
}

const AddIntentButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.addIntent} onClick={onClick}>
      <p>Click to Add A New Intent</p>
    </div>
  )
}

const IntentPicker = ({
  name,
  update,
}: {
  name: string
  update: (x: string) => void
}) => {
  return (
    <div className={styles.picker}>
      <Combobox
        hideEmptyPopup
        data={getAllIntentNames()}
        value={name}
        onChange={update}
      />
    </div>
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
    <div className={styles.contexts}>
      <Multiselect
        defaultValue={["fdc3.instrument"]}
        value={contextTypes}
        data={getAllContextTypes()}
        allowCreate="onFilter"
        onChange={update}
        onCreate={(n) => {
          update([...contextTypes, n])
        }}
      />
    </div>
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
    <>
      <IntentPicker
        name={ei.name}
        update={(x) => {
          const ei2 = { ...ei, name: x }
          update(ei2)
        }}
      />

      <ContextPicker
        contextTypes={ei.contexts}
        update={(x) => {
          const ei2 = { ...ei, contexts: x }
          update(ei2)
        }}
      />

      <div className={styles.rowicon}>
        <InlineButton
          onClick={() => update(null)}
          text="Remove This Intent"
          url="/icons/control/bin.svg"
          className={styles.miniButton}
        />
      </div>
    </>
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
    <div className={styles.interop}>
      <div className={styles.addIntent}>Intents I Listen To:</div>
      {app.intents.map((e, i) => (
        <IntentItem
          ei={e}
          update={(ei: EditableIntent | null) => {
            if (ei) {
              const newState = { ...app, intents: [...app.intents] }
              newState.intents[i] = ei
              update(newState)
            } else {
              const newIntents = [...app.intents]
              newIntents.splice(i, 1)
              const newState = { ...app, intents: newIntents }
              update(newState)
            }
          }}
        />
      ))}

      <AddIntentButton
        onClick={() => {
          const newState = { ...app, intents: [...app.intents] }
          newState.intents.push({
            name: intentTypes[0].title,
            contexts: [CONTEXT_TYPES[0]],
          })
          update(newState)
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
    <div key={d.id} className={styles.item}>
      <div className={styles.verticalControlsGrow}>
        <input
          type="text"
          className={styles.name}
          value={d.title}
          placeholder="App Title"
          onChange={(e) => {
            update({ ...d, title: e.target.value })
          }}
        />
        <input
          type="text"
          className={styles.description}
          value={d.description}
          placeholder="App Description"
          onChange={(e) => {
            update({ ...d, description: e.target.value })
          }}
        />
        <div className={styles.typeRow}>
          <label className={styles.fieldLabel}>Type:</label>
          <select
            className={styles.typeSelect}
            value={d.type}
            onChange={(e) => {
              update({ ...d, type: e.target.value as AppType })
            }}
          >
            <option value="web">Web</option>
            <option value="native">Native</option>
          </select>
        </div>
        <input
          type="text"
          className={`${styles.url} ${d.type === "native" ? styles.disabled : ""}`}
          value={d.url}
          placeholder="https://your.app.url/here"
          disabled={d.type === "native"}
          onChange={(e) => {
            update({ ...d, url: e.target.value })
          }}
        />

        <InteropList app={d} update={update} />
      </div>

      <InlineButton
        onClick={() => update(null)}
        text="Remove This App"
        url="/icons/control/bin.svg"
        className={styles.actionButton}
      />
    </div>
  )
}

export const CustomAppList = () => {
  const [apps, setApps] = useState<EditableState[]>(createInitialState())

  async function updateApps(newApps: EditableState[]): Promise<void> {
    setApps(newApps)
    return getClientState()
      .setCustomApps(convertToDirectoryApps(newApps))
      .then(async () => {
        getClientState().setKnownApps(await getServerState().getApplications())
      })
  }

  return (
    <div className={styles.list}>
      {apps.map((d) => (
        <CustomAppItem
          key={d.id}
          d={d}
          update={(app) => {
            if (app) {
              const idx = apps.findIndex((a) => a.id == d.id)
              const newApps = [...apps]
              newApps[idx] = app
              updateApps(newApps)
            } else {
              const idx = apps.findIndex((a) => a.id == d.id)
              const newApps = [...apps]
              newApps.splice(idx, 1)
              updateApps(newApps)
            }
          }}
        />
      ))}
      <AddButton onClick={() => updateApps([...apps, newApp()])} />
    </div>
  )
}
