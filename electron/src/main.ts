import { app, BrowserWindow } from 'electron'
import http from "http";

const SAIL_URL = 'http://localhost:8090/static/index.html'

async function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: `${__dirname}/preload.js`
        }
    })

    await win.loadFile('static/loading.html')

    await waitForServer()

    await win.loadURL(SAIL_URL)
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

