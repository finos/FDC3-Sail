import { getClientState, type Directory } from "../state"
import styles from "./styles.module.css"
import { DeleteButton } from "./delete-button"
import { AddButton } from "./add-button"

function updateDirectories(directories: Directory[]) {
  void getClientState().setDirectories(directories)
}

function updateDirectory(currentUrl: string, patch: Partial<Directory>): void {
  const directories = getClientState().getDirectories()
  const i = directories.findIndex(x => x.url === currentUrl)
  if (i < 0) {
    return
  }
  directories[i] = { ...directories[i]!, ...patch }
  updateDirectories(directories)
}

function toggleDirectory(d: Directory) {
  updateDirectory(d.url, { active: !d.active })
}

function removeDirectory(d: Directory) {
  if (!confirm("Remove this directory — are you sure?")) {
    return
  }
  const directories = getClientState()
    .getDirectories()
    .filter(x => x.url !== d.url)
  updateDirectories(directories)
}

function DirectoryItem({ d }: { d: Directory }) {
  return (
    <article className={`${styles.settingsCard} ${d.active ? styles.settingsCardActive : ""}`}>
      <div className={styles.settingsFields}>
        <label className={styles.settingsField}>
          <span className={styles.settingsFieldLabel}>Name</span>
          <input
            className={styles.settingsInput}
            type="text"
            value={d.label}
            placeholder="Directory name"
            onChange={e => updateDirectory(d.url, { label: e.target.value })}
          />
        </label>
        <label className={styles.settingsField}>
          <span className={styles.settingsFieldLabel}>URL</span>
          <input
            className={styles.settingsInput}
            type="url"
            value={d.url}
            placeholder="https://example.com/v2/apps"
            onChange={e => updateDirectory(d.url, { url: e.target.value })}
          />
        </label>
      </div>

      <div className={styles.settingsActions}>
        <label className={styles.directoryToggle}>
          <input
            type="checkbox"
            checked={d.active}
            onChange={() => toggleDirectory(d)}
            aria-label={d.active ? "Disable directory" : "Enable directory"}
          />
          <span className={styles.directoryToggleTrack} aria-hidden>
            <span className={styles.directoryToggleThumb} />
          </span>
          <span className={styles.directoryToggleLabel}>{d.active ? "Enabled" : "Disabled"}</span>
        </label>

        <DeleteButton onClick={() => removeDirectory(d)} title="Remove this directory" />
      </div>
    </article>
  )
}

export const DirectoryList = () => {
  const directories = getClientState().getDirectories()

  return (
    <div className={styles.settingsList}>
      {directories.length === 0 ? (
        <p className={styles.settingsEmpty}>No directories yet. Add one to load apps into Sail.</p>
      ) : (
        directories.map((d, i) => <DirectoryItem key={i} d={d} />)
      )}
      <AddButton
        label="Add directory"
        onClick={() => {
          updateDirectories([
            ...getClientState().getDirectories(),
            {
              label: "New Directory",
              url: "",
              active: false,
            },
          ])
        }}
      />
    </div>
  )
}
