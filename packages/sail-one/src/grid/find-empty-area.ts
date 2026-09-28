import type { GridStack } from "gridstack"
import type { AppPanel } from "../state"

export function findEmptyArea(panel: AppPanel, grid: GridStack): void {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x <= grid.getColumn() - (panel.w ?? 1); x++) {
      if (grid.isAreaEmpty(x, y, panel.w ?? 1, panel.h ?? 1)) {
        panel.x = x
        panel.y = y
        return
      }
    }
  }
  panel.x = 0
  panel.y = 0
}
