import { contextBridge } from 'electron'
// import { WebSocketMessaging } from './WebSocketMessaging'
// import { createSailDesktopAgent } from './createSailDesktopAgent'
import { ELECTRON_HELLO, ElectronHelloResponse } from '@finos/fdc3-sail-common'
import { io } from 'socket.io-client'
import { X } from './someImport'

console.log("PRELOAD CALLED", X)


const socket = io("http://localhost:8090")

socket.emitWithAck(ELECTRON_HELLO, {
    url: "bloopy"
}).then((response: ElectronHelloResponse) => {
    if (response.type === 'app') {
        // const messaging = new WebSocketMessaging(socket, response)
        //const api = createSailDesktopAgent(messaging, response)
        contextBridge.exposeInMainWorld('fdc3', [1, 2, 3])
    } else if (response.type === 'da') {
        // do nothing here
    } else {
        throw new Error("Unexpected window type")
    }
})

