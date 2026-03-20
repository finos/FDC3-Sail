import { DesktopAgentHelloArgs, TabDetail } from "@finos/fdc3-sail-common";
import { ChannelType, ChannelState, MessageHandler, BroadcastHandler, IntentHandler, OpenHandler, HeartbeatHandler, LogFunction } from "@finos/fdc3-sail-da-impl";
import { SailFDC3ServerInstance } from "./SailFDC3ServerInstance";
import { SailDirectory } from "../appd/SailDirectory";
import { SocketIOConnection } from "./connection";
import { getSailUrl } from "./sail-handlers/types";
import { createLogger } from "../logger";

// Create handler-specific loggers that adapt pino to the LogFunction signature
function createHandlerLog(name: string): LogFunction {
    const log = createLogger(name);
    return (message: string, ...args: unknown[]) => {
        if (args.length > 0) {
            log.debug({ args }, message);
        } else {
            log.debug(message);
        }
    };
}

/**
 * Converts an HTTP(S) URL to a WebSocket URL.
 * http:// -> ws://
 * https:// -> wss://
 */
function toWebSocketUrl(httpUrl: string): string {
    if (httpUrl.startsWith('https://')) {
        return 'wss://' + httpUrl.substring(8)
    } else if (httpUrl.startsWith('http://')) {
        return 'ws://' + httpUrl.substring(7)
    }
    return httpUrl // Already a WebSocket URL or other protocol
}

export function mapChannels(channels: TabDetail[]): ChannelState[] {
    const out = channels.map((c) => {
        return {
            id: c.id,
            type: ChannelType.user,
            displayMetadata: {
                name: c.id,
                glyph: c.icon,
                color: c.background,
            },
            context: []
        }
    })

    return out
}

export class SailFDC3ServerFactory {

    protected readonly handlers: MessageHandler[] = [];
    protected readonly sessions: Map<string, SailFDC3ServerInstance> = new Map()

    constructor(
        heartbeats: boolean,
        intentTimeoutMs: number = 20000,
        openHandlerTimeoutMs: number = 10000
    ) {
        this.handlers.push(new BroadcastHandler(createHandlerLog('BroadcastHandler')));
        this.handlers.push(new IntentHandler(intentTimeoutMs, createHandlerLog('IntentHandler')));
        this.handlers.push(new OpenHandler(openHandlerTimeoutMs, createHandlerLog('OpenHandler')));

        if (heartbeats) {
            this.handlers.push(
                new HeartbeatHandler(openHandlerTimeoutMs / 10, openHandlerTimeoutMs / 2, openHandlerTimeoutMs, createHandlerLog('HeartbeatHandler'))
            );
        }
    }

    async createInstance(connection: SocketIOConnection, args: DesktopAgentHelloArgs): Promise<SailFDC3ServerInstance> {
        const channels = mapChannels(args.channels)
        const remoteUrlBase = `${toWebSocketUrl(getSailUrl())}/remote/${args.userSessionId}`
        const d = new SailDirectory(remoteUrlBase)
        const out = new SailFDC3ServerInstance(d, connection, this.handlers, channels)
        await out.reloadAppDirectories(args.directories, args.customApps)
        this.sessions.set(args.userSessionId, out)
        return out
    }

    getSessionCount(): number {
        return this.sessions.size
    }

    shutdownInstance(s: string) {
        const i = this.sessions.get(s);
        if (i) {
            i.shutdown()
        }
        this.sessions.delete(s);
    }

    async shutdownInstances(): Promise<void> {
        this.sessions.keys().forEach(i => this.shutdownInstance(i))
    }

    async shutdownHandlers(): Promise<void> {
        this.handlers.forEach(handler => handler.shutdown());
    }

    async shutdownEverything(): Promise<void> {
        await this.shutdownInstances()
        await this.shutdownHandlers()
    }

    getSession(sessionId: string): SailFDC3ServerInstance | undefined {
        return this.sessions.get(sessionId)
    }
}