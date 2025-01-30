import { AbstractMessaging, RegisterableListener } from "@finos/fdc3-agent-proxy";
import { v4 as uuidv4 } from 'uuid';
import { Socket } from "socket.io-client"
import { AppIdentifier } from "@finos/fdc3-standard";
import { FDC3_APP_EVENT } from "@finos/fdc3-sail-common";
import { AppRequestMessage, WebConnectionProtocol6Goodbye } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes";

export class WebSocketMessaging extends AbstractMessaging {

    private readonly listeners: Map<string, RegisterableListener> = new Map();
    private readonly s: Socket

    constructor(s: Socket, appIdentifier: AppIdentifier) {
        super(appIdentifier);
        this.s = s
    }

    createUUID(): string {
        return uuidv4();
    }

    async post(message: AppRequestMessage | WebConnectionProtocol6Goodbye): Promise<void> {
        this.s.emit(FDC3_APP_EVENT, message);
    }

    register(l: RegisterableListener): void {
        this.listeners.set(l.id!, l);
    }

    unregister(id: string): void {
        this.listeners.delete(id);
    }

    createMeta(): AppRequestMessage['meta'] {
        return {
            requestUuid: this.createUUID(),
            timestamp: new Date(),
            source: super.getAppIdentifier(),
        };
    }

    getTimeoutMs(): number {
        throw new Error("Method not implemented.");
    }

    async disconnect(): Promise<void> {
        this.s.close()
    }

}
