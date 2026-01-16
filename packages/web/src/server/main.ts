import express from "express";
import ViteExpress from "vite-express";
import { SailFDC3ServerFactory } from "./da/SailFDC3ServerFactory";
import { initSailSocketIOService } from "./da/initSailSocketIOService";
import { RemoteSocketService } from "./da/RemoteSocketService";
import dotenv from "dotenv";
import { getSailUrl } from "./da/sail-handlers";

// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(express.json())

const httpServer = ViteExpress.listen(app, 8090, () => {
  console.log(`SAIL Server is listening in ${process.env.NODE_ENV} mode.  Head to ${getSailUrl()}`)
});

const factory = new SailFDC3ServerFactory(true)
const remoteSocketService = new RemoteSocketService(httpServer, factory)
initSailSocketIOService(httpServer, factory, remoteSocketService)


app.get("/polygon-key", (_req, res) => {
  res.json({ key: process.env.POLYGON_API_KEY ?? "no-key" })
})

app.get("/", (_req, res) => {
  res.redirect("/html/index.html")
})
