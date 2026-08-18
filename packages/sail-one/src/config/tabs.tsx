import { useEffect, useState, type DragEvent } from "react"
import { GripVertical, Pipette } from "lucide-react"
import { getClientState, type TabDetail } from "../state"
import styles from "./styles.module.css"
import { DeleteButton } from "./delete-button"
import { AddButton } from "./add-button"

const ICON_PATH = "/icons/tabs/"

const BUILT_IN_TABS: string[] = [
  "noun-airplane-3707662.svg",
  "noun-camera-3707659.svg",
  "noun-camera-3707661.svg",
  "noun-cellphone-3707657.svg",
  "noun-checked-baggage-3707665.svg",
  "noun-console-3707664.svg",
  "noun-driller-3707669.svg",
  "noun-headphone-3707674.svg",
  "noun-machine-3707678.svg",
  "noun-pen-3707679.svg",
  "noun-power-3707684.svg",
  "noun-printer-3707691.svg",
  "noun-radio-3707701.svg",
  "noun-ship-3707690.svg",
  "noun-ship-3707693.svg",
  "noun-washing-3707699.svg",
]

const BACKGROUND_COLOURS = [
  "#0061F2",
  "#FF5A1F",
  "#00A86B",
  "#A100FF",
  "#E11D48",
  "#0EA5E9",
  "#16A34A",
  "#F59E0B",
  "#0891B2",
  "#7C3AED",
]

function newIconUrl(): string {
  return ICON_PATH + BUILT_IN_TABS[getClientState().getTabs().length % BUILT_IN_TABS.length]
}

function newTabTitle(): string {
  let i = 1
  while (
    getClientState()
      .getTabs()
      .find(t => t.id == "New Tab " + i)
  ) {
    i++
  }
  return "New Tab " + i
}

function newBackgroundColour(): string {
  return BACKGROUND_COLOURS[getClientState().getTabs().length % BACKGROUND_COLOURS.length]!
}

function updateBackground(id: string, background: string) {
  const tab = getClientState()
    .getTabs()
    .find(t => t.id == id)!
  tab.background = background
  void getClientState().updateTab(tab)
}

function updateIconUrl(id: string, url: string) {
  const tab = getClientState()
    .getTabs()
    .find(t => t.id == id)!
  tab.icon = url
  void getClientState().updateTab(tab)
}

function removeTab(id: string) {
  if (getClientState().getTabs().length == 1) {
    alert("Cannot remove the last tab")
    return
  }

  const appCount = getClientState()
    .getPanels()
    .filter(p => p.tabId == id).length

  const message =
    appCount > 0
      ? `This channel has ${appCount} open app${appCount === 1 ? "" : "s"}. Delete it anyway?`
      : "Remove this tab — are you sure?"

  if (confirm(message)) {
    void getClientState().removeTab(id)
  }
}

function TabItem({
  d,
  dragId,
  dropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  d: TabDetail
  dragId: string | null
  dropTarget: { id: string; place: "before" | "after" } | null
  onDragStart: (id: string) => void
  onDragOver: (e: DragEvent, id: string) => void
  onDrop: (id: string) => void
  onDragEnd: () => void
}) {
  const [title, setTitle] = useState(d.id)
  const isDragging = dragId === d.id
  const showBefore = dropTarget?.id === d.id && dropTarget.place === "before"
  const showAfter = dropTarget?.id === d.id && dropTarget.place === "after"

  useEffect(() => {
    setTitle(d.id)
  }, [d.id])

  return (
    <article
      className={[
        styles.settingsCard,
        isDragging ? styles.settingsCardDragging : "",
        showBefore ? styles.dropBefore : "",
        showAfter ? styles.dropAfter : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={e => onDragOver(e, d.id)}
      onDrop={() => onDrop(d.id)}
    >
      <div className={styles.tabCardBody}>
        <div className={styles.tabSide}>
          <button
            type="button"
            className={styles.dragHandle}
            draggable
            title="Drag to reorder"
            aria-label={`Drag to reorder ${d.id}`}
            onDragStart={e => {
              e.dataTransfer.effectAllowed = "move"
              e.dataTransfer.setData("text/plain", d.id)
              const row = e.currentTarget.closest(`.${styles.settingsCard}`)
              if (row instanceof HTMLElement) {
                e.dataTransfer.setDragImage(row, 24, row.offsetHeight / 2)
              }
              onDragStart(d.id)
            }}
            onDragEnd={onDragEnd}
          >
            <GripVertical aria-hidden strokeWidth={2} />
          </button>
          <label className={styles.tabColorSwatch} style={{ backgroundColor: d.background }}>
            <img src={d.icon} alt="" className={styles.tabColorSwatchIcon} />
            <span className={styles.tabColorSwatchHint} aria-hidden>
              <Pipette strokeWidth={2} />
            </span>
            <input
              className={styles.tabColorSwatchInput}
              type="color"
              value={d.background}
              title="Change tab color"
              aria-label={`Change color for ${d.id}`}
              onChange={e => updateBackground(d.id, e.currentTarget.value)}
            />
          </label>
        </div>

        <div className={styles.settingsFields}>
          <div className={styles.tabTitleRow}>
            <label className={styles.settingsField}>
              <span className={styles.settingsFieldLabel}>Name</span>
              <input
                className={styles.settingsInput}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => {
                  void getClientState().renameTab(d.id, title)
                }}
              />
            </label>
            <DeleteButton onClick={() => removeTab(d.id)} title="Remove this tab" />
          </div>
          <label className={styles.settingsField}>
            <span className={styles.settingsFieldLabel}>Icon URL</span>
            <input
              className={styles.settingsInput}
              type="text"
              value={d.icon}
              onChange={e => updateIconUrl(d.id, e.target.value)}
            />
          </label>
        </div>
      </div>
    </article>
  )
}

export const TabList = () => {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    id: string
    place: "before" | "after"
  } | null>(null)

  function clearDrag() {
    setDragId(null)
    setDropTarget(null)
  }

  return (
    <div className={styles.settingsList}>
      {getClientState()
        .getTabs()
        .map(d => (
          <TabItem
            key={d.id}
            d={d}
            dragId={dragId}
            dropTarget={dropTarget}
            onDragStart={setDragId}
            onDragOver={(e, id) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = "move"
              if (!dragId || dragId === id) {
                setDropTarget(null)
                return
              }
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const place = e.clientY < rect.top + rect.height / 2 ? "before" : "after"
              setDropTarget(prev =>
                prev?.id === id && prev.place === place ? prev : { id, place },
              )
            }}
            onDrop={toId => {
              if (dragId && dropTarget && dropTarget.id === toId) {
                void getClientState().reorderTab(dragId, toId, dropTarget.place)
              } else if (dragId) {
                void getClientState().reorderTab(dragId, toId, "before")
              }
              clearDrag()
            }}
            onDragEnd={clearDrag}
          />
        ))}
      <AddButton
        label="Add tab"
        onClick={() => {
          void getClientState().addTab({
            id: newTabTitle(),
            icon: newIconUrl(),
            background: newBackgroundColour(),
          })
        }}
      />
    </div>
  )
}
