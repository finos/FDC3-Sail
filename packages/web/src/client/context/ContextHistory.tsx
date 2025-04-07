import { Component } from "react"
import { Popup } from "../popups/popup"
import styles from "./styles.module.css"
import { prettyPrintJson } from "pretty-print-json"
import { Context } from "@finos/fdc3-context"

type ContextHistoryPanelProps = {
  history: Context[]
  currentChannel: string
  closeAction: () => void
}

type AppPanelState = {
  chosen: number
}

export const ContextHistoryItem = ({
  context,
  selected,
  onClick,
}: {
  context: Context
  selected: boolean
  onClick: () => void
}) => {
  return (
    <div
      className={`${styles.contextItem} ${selected ? styles.selected : ""}`}
      onClick={onClick}
    >
      <div className={styles.contextType}>{context.type}</div>
      <div className={styles.contextData}>{context.name ?? "No Name"}</div>
    </div>
  )
}

export class ContextHistoryPanel extends Component<
  ContextHistoryPanelProps,
  AppPanelState
> {
  constructor(props: ContextHistoryPanelProps) {
    super(props)
    this.state = {
      chosen: 0,
    }
  }

  render() {
    const json = prettyPrintJson.toHtml(this.props.history[this.state.chosen], {
      indent: 2,
      linkUrls: false,
      trailingCommas: false,
      quoteKeys: true,
    })

    return (
      <Popup
        key="ContextHistoryPopup"
        title={`Context History On "${this.props.currentChannel}"`}
        area={
          <div className={styles.contextContent}>
            <div className={styles.contextArea}>
              {this.props.history.map((h, i) => (
                <ContextHistoryItem
                  key={i}
                  context={h}
                  onClick={() => this.setState({ chosen: i })}
                  selected={i == this.state.chosen}
                />
              ))}
            </div>
            <div className={styles.contextDetail}>
              <div dangerouslySetInnerHTML={{ __html: json }} />
            </div>
          </div>
        }
        buttons={[]}
        closeAction={() => this.props.closeAction()}
        closeName="Close"
      />
    )
  }
}
