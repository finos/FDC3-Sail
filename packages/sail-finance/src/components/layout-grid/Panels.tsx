import type { IDockviewPanelProps } from "dockview-react"

import { AppDirectory } from "../app-directory/AppDirectory"

import { FDC3Panel, type FDC3AppPanel } from "./panel-templates/FDC3IframePanel"

export const Panels = {
  default: (props: IDockviewPanelProps) => {
    return (
      <div
        style={{
          height: "100%",
          overflow: "auto",
        }}
      >
        <AppDirectory panelProps={props} />
      </div>
    )
  },
  fdc3: (props: IDockviewPanelProps) => {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: props.params is restored from Dockview's persisted layout JSON on reload, whose actual shape can predate the current FDC3AppPanel type
    const panelData = (props.params as { panel?: FDC3AppPanel })?.panel

    if (!panelData) {
      return <div className="p-4 text-red-500">Error: No panel data provided</div>
    }

    return <FDC3Panel {...props} panel={panelData} />
  },
}
