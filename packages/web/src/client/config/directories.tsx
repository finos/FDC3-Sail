import {
  Directory,
  getClientState,
  getServerState,
} from "@finos/fdc3-sail-common"
import styles from "./styles.module.css"
import { InlineButton } from "./shared"

function updateText(url: string, text: string) {
  const directories = getClientState().getDirectories()
  const d = directories.find((d) => d.url == url)
  d!.label = text
  getClientState().setDirectories(directories)
}

function updateUrl(url: string, text: string) {
  const directories = getClientState().getDirectories()
  const d = directories.find((d) => d.url == url)
  d!.url = text
  getClientState().setDirectories(directories)
}

function toggleDirectory(d: Directory) {
  const directories = getClientState().getDirectories()
  const i = directories.findIndex((x) => x.url == d.url)
  directories[i].active = !directories[i].active
  updateDirectories(directories)
}

function updateDirectories(directories: Directory[]) {
  getClientState()
    .setDirectories(directories)
    .then(async () => {
      getClientState().setKnownApps(await getServerState().getApplications())
    })
}

function removeDirectory(d: Directory) {
  if (confirm("Remove this directory - are you sure?") == true) {
    const directories = getClientState().getDirectories()
    const i = directories.findIndex((x) => x.url == d.url)
    directories.splice(i, 1)
    updateDirectories(directories)
  }
}

const AddButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.add} onClick={onClick}>
      <p>Click to Add New Directory</p>
    </div>
  )
}

const DirectoryItem = ({ d }: { d: Directory }) => {
  return (
    <div key={d.url} className={styles.item}>
      <div className={styles.verticalControlsGrow}>
        <div
          className={styles.name}
          contentEditable={true}
          onBlur={(e) => updateText(d.url, e.currentTarget.textContent!)}
        >
          {d.label}
        </div>
        <div
          className={styles.url}
          contentEditable={true}
          onBlur={(e) => updateUrl(d.url, e.currentTarget.textContent!)}
        >
          {d.url}
        </div>
      </div>

      <InlineButton
        onClick={() => toggleDirectory(d)}
        text="Toggle Use Of Directory"
        url={
          d.active
            ? "/icons/control/switched-on.svg"
            : "/icons/control/switched-off.svg"
        }
        className={styles.actionButton}
      />

      <InlineButton
        onClick={() => removeDirectory(d)}
        text="Remove This Directory"
        url="/icons/control/bin.svg"
        className={styles.actionButton}
      />
    </div>
  )
}

export const DirectoryList = () => {
  return (
    <div className={styles.list}>
      {getClientState()
        .getDirectories()
        .map((d) => (
          <DirectoryItem key={d.url} d={d} />
        ))}
      <AddButton
        onClick={() => {
          const directories = getClientState().getDirectories()
          directories.push({
            label: "New Directory",
            url: "",
            active: false,
          })
          updateDirectories(directories)
        }}
      />{" "}
    </div>
  )
}
