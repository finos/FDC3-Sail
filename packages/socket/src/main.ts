import { Server } from "socket.io"
import { createServer } from "http"
import { SailFDC3Server } from "./desktop-agent/SailFDC3Server"
import { initSocketService } from "./desktop-agent/initSocketService"
import dotenv from "dotenv"

// Load environment variables from .env file
dotenv.config()

// running sessions - the server state
const sessions = new Map<string, SailFDC3Server>()

// Create HTTP server
const httpServer = createServer()

// Create Socket.IO server with CORS for localhost
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

const port = process.env.PORT || 8090

httpServer.listen(port, () => {
  console.log(`SAIL Socket Server is listening on port ${port}`)
})

initSocketService(io, sessions)
