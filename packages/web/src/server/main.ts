import express from "express";
import ViteExpress from "vite-express";
import { SailFDC3ServerFactory } from "./da/SailFDC3ServerFactory";
import { getSailUrl, initSocketService } from "./da/initSocketService";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(express.json())

const httpServer = ViteExpress.listen(app, 8090, () => {
  console.log(`SAIL Server is listening in ${process.env.NODE_ENV} mode.  Head to ${getSailUrl()}`)
});

initSocketService(httpServer, new SailFDC3ServerFactory(true))


app.get("/polygon-key", (_req, res) => {
  res.json({ key: process.env.POLYGON_API_KEY ?? "no-key" })
})

app.get("/", (_req, res) => {
  res.redirect("/html/index.html")
})
