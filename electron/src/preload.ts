import { ELECTRON_HELLO, ElectronHelloResponse } from '@finos/fdc3-sail-common'
import { contextBridge } from 'electron'
import { io } from 'socket.io-client'
import { WebSocketMessaging } from './WebSocketMessaging'
import { createSailDesktopAgent } from './createSailDesktopAgent'


const socket = io("http://localhost:8090")

socket.emitWithAck(ELECTRON_HELLO, {
    url: "bloopy"
}).then((response: ElectronHelloResponse) => {
    if (response.type === 'app') {
        const messaging = new WebSocketMessaging(socket, response)
        const api = createSailDesktopAgent(messaging, response)
        contextBridge.exposeInMainWorld('fdc3', window.name)
    } else if (response.type === 'da') {
        // do nothing here
    } else {
        throw new Error("Unexpected window type")
    }
})


