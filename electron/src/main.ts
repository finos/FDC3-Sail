import { app, BrowserView, BrowserWindow } from 'electron'
import http from "http";

const WEB_PREFERENCES = {
    contextIsolation: true,    // allow frame preload
    nodeIntegration: true,
    nodeIntegrationInSubFrames: true,
    preload: `${__dirname}/../../preload/dist/preload.js`
}

export const SAIL_URL = 'http://localhost:8090/static/index.html'

async function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: WEB_PREFERENCES
    })

    await win.loadFile('static/loading.html')

    await waitForServer()

    await win.loadURL(SAIL_URL)

    // Ensures the preload gets run in tabs
    win.webContents.setWindowOpenHandler(hd => {
        console.log('Window open handler', hd)
        return {
            action: 'allow',
            createWindow: (options) => {
                const win2 = new BrowserWindow({
                    ...options,
                    width: 600,
                    height: 400,
                    webPreferences: WEB_PREFERENCES
                })
                return win2.webContents
            }
        }
    })
}

app.whenReady().then(() => {
    createWindow()
})



async function waitForServer(timeout = 10000, interval = 500) {
    const startTime = Date.now();

    return new Promise<void>((resolve, reject) => {
        const checkServer = () => {
            http.get(SAIL_URL, (res) => {
                console.log('Testing for server start', res);
                if (res.statusCode === 200) {
                    resolve();
                } else {
                    retry();
                }
            }).on('error', retry);
        };

        const retry = () => {
            if (Date.now() - startTime >= timeout) {
                reject(new Error('Server did not start in time'));
            } else {
                setTimeout(checkServer, interval);
            }
        };

        checkServer();
    });
}

