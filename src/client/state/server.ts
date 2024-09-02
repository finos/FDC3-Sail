import { DirectoryApp } from "@kite9/da-server";
import { getClientState } from "./client";
import { DesktopAgentHelloArgs } from "../../server/da/message-types";

export interface ServerState {

    getApplications(): Promise<DirectoryApp[]>

    /**
     *  Returns the instance ID for a new application
     */
    registerAppLaunch(appId: string): Promise<string>

    registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void>
}

class ServerStateImpl implements ServerState {

    async getApplications(): Promise<DirectoryApp[]> {
        const userSessionId = getClientState().getUserSessionID()
        return await fetch("/apps?" + new URLSearchParams({ userSessionId }).toString())
            .then((response) => response.json())
            .then(o => o as DirectoryApp[]);
    }

    async registerAppLaunch(appId: string): Promise<string> {
        const userSessionId = getClientState().getUserSessionID()
        const response = await fetch("/registerAppLaunch", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ appId, userSessionId })
        })

        const json = await response.json()
        return json.instanceId
    }

    async registerDesktopAgent(props: DesktopAgentHelloArgs): Promise<void> {
        await fetch("/registerDesktopAgent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(props)
        })
    }
}

const theServerState = new ServerStateImpl()

export function getServerState(): ServerState {
    return theServerState
}