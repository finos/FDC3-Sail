import express from "express";
import ViteExpress from "vite-express";
import { SailFDC3Server } from "./da/SailFDC3Server";
import { getSailUrl, initSocketService } from "./da/initSocketService";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();

// running sesssions - the server state
const sessions = new Map<string, SailFDC3Server>()

app.use(express.json())

const httpServer = ViteExpress.listen(app, 8090, () => {
  console.log(`SAIL Server is listening.  Head to ${getSailUrl()}`)
});

initSocketService(httpServer, sessions)


app.get("/polygon-key", (_req, res) => {
  res.json({ key: process.env.POLYGON_API_KEY ?? "no-key" })
})

app.get("/", (_req, res) => {
  // redirect to /static/index.html
  res.redirect("/static/index.html")
})
