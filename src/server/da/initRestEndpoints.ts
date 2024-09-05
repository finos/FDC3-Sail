import { SailFDC3Server } from "./SailFDC3Server";
import { Express } from "express-serve-static-core";
import express from "express";

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


}
