import { GridStack } from "gridstack"

export function setupTabDropTargets(onTargetChange: (tabId: string | null) => void): () => void {
  const dd = GridStack.getDD()
  const tabs = Array.from(document.querySelectorAll<HTMLElement>(".drop-tab"))

  tabs.forEach(tab => {
    dd.off(tab, "dropover")
    dd.off(tab, "dropout")
    dd.droppable(tab, {
      accept: () => true,
    })
    dd.on(tab, "dropover", () => {
      onTargetChange(tab.id)
    })
    dd.on(tab, "dropout", () => {
      onTargetChange(null)
    })
  })

  return () => {
    tabs.forEach(tab => {
      dd.off(tab, "dropover")
      dd.off(tab, "dropout")
    })
  }
}
