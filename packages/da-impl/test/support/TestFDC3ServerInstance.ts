import {
  InstanceID,
  State,
  AppRegistration,
  Fdc3ApiVersion,
} from "../../src/AppRegistration"
import { AbstractFDC3ServerInstance } from "../../src/AbstractFDC3ServerInstance"
import { Directory } from "../../src/directory/DirectoryInterface"
import { CustomWorld } from "../world"
import { Context } from "@finos/fdc3-context"
import { OpenError, AppIdentifier, AppIntent } from "@finos/fdc3-standard"
import { MessageHandler } from "../../src/handlers/MessageHandler"
import {
  ChannelState,
  HandlersByVersion,
} from "../../src/FDC3ServerInstance"
import { BroadcastHandler as BroadcastHandlerV2 } from "../../src/handlers/v2/BroadcastHandler"
import { IntentHandler as IntentHandlerV2 } from "../../src/handlers/v2/IntentHandler"
import { OpenHandler as OpenHandlerV2 } from "../../src/handlers/v2/OpenHandler"
import { HeartbeatHandler as HeartbeatHandlerV2 } from "../../src/handlers/v2/HeartbeatHandler"
import { BroadcastHandler as BroadcastHandlerV3 } from "../../src/handlers/v3/BroadcastHandler"
import { IntentHandler as IntentHandlerV3 } from "../../src/handlers/v3/IntentHandler"
import { OpenHandler as OpenHandlerV3 } from "../../src/handlers/v3/OpenHandler"

type ConnectionDetails = AppRegistration & {
  msg?: object
}

type MessageRecord = {
  to?: AppIdentifier
  uuid?: InstanceID
  msg: object
}

export class TestFDC3ServerInstance extends AbstractFDC3ServerInstance {
  public postedMessages: MessageRecord[] = []
  private readonly cw: CustomWorld
  private instances: ConnectionDetails[] = []
  private nextInstanceId: number = 0
  private nextUUID: number = 0
  public handlers: MessageHandler[]
  /** Default FDC3 API version for apps created in this test world. */
  public defaultFdc3Version: Fdc3ApiVersion = "2.2"

  constructor(
    cw: CustomWorld,
    handlersByVersion: HandlersByVersion,
    channels: ChannelState[],
    private readonly directory: Directory,
  ) {
    super(handlersByVersion, channels)
    this.cw = cw
    this.handlers = [
      ...handlersByVersion["2.2"],
      ...handlersByVersion["3.0"],
    ]
  }

  getDirectory(): Directory {
    return this.directory
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async narrowIntents(
    _raiser: AppIdentifier,
    appIntents: AppIntent[],
    _context: Context,
  ): Promise<AppIntent[]> {
    return appIntents
  }

  getInstanceDetails(uuid: string) {
    return this.instances.find((ca) => ca.instanceId === uuid)
  }

  setInstanceDetails(uuid: InstanceID, appId: ConnectionDetails) {
    if (uuid != appId.instanceId) {
      throw new Error("UUID mismatch")
    }
    this.instances = this.instances.filter((ca) => ca.instanceId !== uuid)
    this.instances.push({
      ...appId,
      fdc3Version: appId.fdc3Version ?? this.defaultFdc3Version,
    })
  }

  async open(appId: string): Promise<InstanceID> {
    const ni = this.nextInstanceId++
    if (appId.includes("missing")) {
      throw new Error(OpenError.AppNotFound)
    } else {
      const uuid = "uuid-" + ni
      this.instances.push({
        appId,
        instanceId: uuid,
        state: State.Pending,
        fdc3Version: this.defaultFdc3Version,
      })
      return uuid
    }
  }

  async close(instanceId: InstanceID): Promise<void> {
    await this.setAppState(instanceId, State.Terminated)
  }

  async setAppState(app: InstanceID, newState: State): Promise<void> {
    const found = this.instances.find((a) => a.instanceId == app)
    if (found) {
      const currentState = found.state
      if (currentState !== State.Terminated && newState === State.Terminated) {
        await this.cleanupApp(app)
      }
      found.state = newState
    }
  }

  async getConnectedApps(): Promise<AppRegistration[]> {
    return (await this.getAllApps()).filter((a) => a.state == State.Connected)
  }

  async getAllApps(): Promise<AppRegistration[]> {
    return this.instances.map((x) => {
      return {
        appId: x.appId,
        instanceId: x.instanceId,
        state: x.state,
        fdc3Version: x.fdc3Version ?? this.defaultFdc3Version,
      }
    })
  }

  async isAppConnected(app: InstanceID): Promise<boolean> {
    const found = this.instances.find(
      (a) => a.instanceId == app && a.state == State.Connected,
    )
    return found != null
  }

  provider(): string {
    return "cucumber-provider"
  }
  providerVersion(): string {
    return "1.2.3.TEST"
  }
  fdc3Version(): string {
    return "3.0"
  }

  createUUID(): string {
    return "uuid" + this.nextUUID++
  }

  async post(msg: object, to: InstanceID): Promise<void> {
    if (to == null) {
      this.postedMessages.push({ msg })
    } else {
      const id = this.getInstanceDetails(to)
      const app = id
        ? {
            appId: id!.appId,
            instanceId: id!.instanceId,
          }
        : undefined
      this.postedMessages.push({
        msg,
        to: app,
        uuid: to,
      })
    }
  }

  log(message: string): void {
    this.cw.log(message)
  }

  /**
   * USED FOR TESTING
   */
  getInstanceUUID(appId: AppIdentifier): InstanceID {
    this.setInstanceDetails(appId.instanceId!, {
      appId: appId.appId,
      instanceId: appId.instanceId!,
      state: State.Connected,
      fdc3Version: this.defaultFdc3Version,
    })
    return appId.instanceId!
  }

  /**
   * USED FOR TESTING
   */
  async shutdown(): Promise<void> {
    super.shutdown()
    // Deduplicate shared handlers (e.g. shared heartbeat)
    ;[...new Set(this.handlers)].forEach((handler) => handler.shutdown())
  }
}

export function createTestFDC3ServerInstance(
  cw: CustomWorld,
  channels: ChannelState[],
  directory: Directory,
  heartbeats: boolean,
): TestFDC3ServerInstance {
  const v2: MessageHandler[] = [
    new BroadcastHandlerV2(),
    new IntentHandlerV2(200),
    new OpenHandlerV2(2000),
  ]
  const v3: MessageHandler[] = [
    new BroadcastHandlerV3(),
    new IntentHandlerV3(200),
    new OpenHandlerV3(2000),
  ]

  if (heartbeats) {
    // Share a single heartbeat handler across versions to avoid duplicate timers
    const hb = new HeartbeatHandlerV2(300, 1000, 3000)
    v2.push(hb)
    v3.push(hb)
  }

  const handlersByVersion: HandlersByVersion = {
    "2.2": v2,
    "3.0": v3,
  }

  return new TestFDC3ServerInstance(cw, handlersByVersion, channels, directory)
}
