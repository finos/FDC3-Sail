import express from "express";
import ViteExpress from "vite-express";
import { SailFDC3Server } from "./da/SailFDC3Server";
import { getSailUrl, initSocketService } from "./da/initSocketService";

const app = express();

// running sesssions - the server state
const sessions = new Map<string, SailFDC3Server>()

app.use(express.json())

const httpServer = ViteExpress.listen(app, 8090, () =>
  console.log("SAIL Server is listening.  Head to " + getSailUrl()),
);

initSocketService(httpServer, sessions)
