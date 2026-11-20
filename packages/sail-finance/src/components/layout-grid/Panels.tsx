import type { IDockviewPanelProps } from "dockview-react"

import { AppDirectory } from "../app-directory/AppDirectory"

import { AppIframePanel, type AppPanel } from "./panel-templates/AppIframePanel"

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
  app: (props: IDockviewPanelProps) => {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- localStorage-persisted state: props.params is restored from Dockview's persisted layout JSON on reload
    const panelData = (props.params as { panel?: AppPanel })?.panel

    if (!panelData) {
      return <div className="p-4 text-red-500">Error: No panel data provided</div>
    }

    return <AppIframePanel {...props} panel={panelData} />
  },
}
