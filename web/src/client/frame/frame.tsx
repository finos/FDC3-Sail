import { Bin, Controls, NewPanel } from "../controls/controls"
import { Logo, Settings } from "../top/top"
import { Tabs } from "../tabs/tabs"
import styles from "./styles.module.css"
import {
  ClientState,
  getClientState,
  AppState,
  getServerState,
} from "@finos/fdc3-sail-common"
import { Component } from "react"
import { AppDPanel } from "../appd/appd"
import { Content, Grids } from "../grid/grid"
import { GridsStateImpl, GridsState } from "../grid/gridstate"
import { ConfigPanel } from "../config/config"
import { ResolverPanel } from "../resolver/resolver"

enum Popup {
  NONE,
  APPD,
  SETTINGS,
  RESOLVER,
}

interface FrameProps {
  cs: ClientState
  as: AppState
}

interface FrameState {
  popup: Popup
}

const CONTAINER_ID = "container-id"

export class Frame extends Component<FrameProps, FrameState> {
  private gs: GridsState = new GridsStateImpl(
    CONTAINER_ID,
    (ap, id) => (
      <Content panel={ap} cs={this.props.cs} as={this.props.as} id={id} />
    ),
    getClientState(),
  )

  constructor(p: FrameProps) {
    super(p)
    this.state = {
      popup: Popup.NONE,
    }
  }

  render() {
    const activeTab = this.props.cs.getActiveTab()

    return (
      <div className={styles.outer}>
        <div className={styles.top}>
          <Logo />
          <Settings onClick={() => this.setState({ popup: Popup.SETTINGS })} />
        </div>
        <div className={styles.left}>
          <Tabs cs={this.props.cs} />
          <Controls>
            <NewPanel onClick={() => this.setState({ popup: Popup.APPD })} />
            <Bin />
          </Controls>
        </div>
        <div
          className={styles.main}
          style={{ border: `1px solid ${activeTab!!.background}` }}
        >
          <Grids
            cs={this.props.cs}
            gs={this.gs}
            as={this.props.as}
            id={CONTAINER_ID}
          />
        </div>
        {this.state?.popup == Popup.APPD ? (
          <AppDPanel
            key="appd"
            closeAction={() =>
              this.setState({
                popup: Popup.NONE,
              })
            }
          />
        ) : null}
        {this.state?.popup == Popup.SETTINGS ? (
          <ConfigPanel
            key="config"
            cs={this.props.cs}
            closeAction={() =>
              this.setState({
                popup: Popup.NONE,
              })
            }
          />
        ) : null}
        {this.props.cs.getIntentResolution() ? (
          <ResolverPanel
            key="resolver"
            appIntents={this.props.cs.getIntentResolution()!!.appIntents}
            context={this.props.cs.getIntentResolution()!!.context}
            channelDetails={this.props.cs.getTabs()}
            currentChannel={this.props.cs.getActiveTab()!!.id}
            panelDetails={this.props.cs.getPanels()}
            appDetails={this.props.cs.getKnownApps()}
            closeAction={() => {
              this.props.cs.setIntentResolution(null)
            }}
            chooseAction={(chosenApp, chosenIntent, chosenChannel) => {
              getServerState().intentChosen(
                this.props.cs.getIntentResolution()!!.requestId,
                chosenApp,
                chosenIntent,
                chosenChannel,
              )
            }}
          />
        ) : null}
      </div>
    )
  }
}
