import { SailFDC3Server } from "./SailFDC3Server";
import { Express } from "express-serve-static-core";
import express from "express";
import { DesktopAgentHelloArgs } from "./message-types";
import { SailServerContext } from "./SailServerContext";
import { SailDirectory } from "../appd/SailDirectory";

export function initRestEndpoints(app: Express, sessions: Map<string, SailFDC3Server>) {

    app.get("/iframe", (_, res) => {
        res.send("Hello Vite + TypeScript!");
    });

    app.get("/apps", (req, res) => {
        const userSessionId = (req.query as any)['userSessionId']
        const session = sessions.get(userSessionId)
        if (session) {
            res.send(JSON.stringify(session.getDirectory().allApps))
        } else {
            res.status(404).send("Session not found")
        }
    })

    app.post("/registerAppLaunch", express.json(), async (req, res) => {
        const { appId, userSessionId } = req.body
        const session = sessions.get(userSessionId)
        if (session) {
            const instanceId = await session.serverContext.open(appId)
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ instanceId }));
            console.log("Openend app", appId, instanceId)
        } else {
            res.status(404).send("Session not found")
        }
    })

    app.post("/registerDesktopAgent", express.json(), async (req, res) => {
        const props: DesktopAgentHelloArgs = req.body
        const myInstance = sessions.get(props.userSessionId)

        if (myInstance) {
            // reconfiguring current session
            const newFdc3Server = new SailFDC3Server(myInstance.serverContext, props)
            sessions.set(props.userSessionId, newFdc3Server)
            console.log("updated desktop agent channels and directories", sessions.size, props.userSessionId)
        } else {
            // starting session
            const serverContext = new SailServerContext(new SailDirectory())
            const fdc3Server = new SailFDC3Server(serverContext, props)
            sessions.set(props.userSessionId, fdc3Server)
            console.log("created agent session.  Running sessions ", sessions.size, props.userSessionId)
        }
    })
}
