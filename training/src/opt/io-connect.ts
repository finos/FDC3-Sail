import IOBrowserPlatform from "@interopio/browser-platform";
import IOBrowser from "@interopio/browser";
import "@interopio/fdc3";
import { DesktopAgent } from "@kite9/fdc3";


export async function ioConnectMainSetup(): Promise<DesktopAgent> {
    const channels = {
        definitions: [
            {
                "name": "Red",
                "meta": {
                    "color": "red",
                    "fdc3": {
                        "id": "fdc3.channel.1",
                        "displayMetadata": {
                            "name": "Channel 1",
                            "glyph": "1"
                        }
                    }
                }
            },
            {
                "name": "Green",
                "meta": {
                    "color": "green",
                    "fdc3": {
                        "id": "fdc3.channel.2",
                        "displayMetadata": {
                            "name": "Channel 2",
                            "glyph": "2"
                        }
                    }
                }
            },
            {
                "name": "Blue",
                "meta": {
                    "color": "blue",
                    "fdc3": {
                        "id": "fdc3.channel.3",
                        "displayMetadata": {
                            "name": "Channel 3",
                            "glyph": "3"
                        }
                    }
                }
            }
        ]
    };

    const config = {
        licenseKey: "my-license-key",
        channels
    };

    const { io } = await IOBrowserPlatform(config);
    const info = await window.fdc3.getInfo();

    console.log(`FDC3 provider: ${info.provider}, FDC3 version: ${info.fdc3Version}`);

    return window.fdc3
}


export async function ioConnectClientSetup(): Promise<DesktopAgent> {

    const io = await IOBrowser();

    // The FDC3 API will now be available as an `fdc3` object injected in the global `window` object.
    const info = await window.fdc3.getInfo();

    console.log(`FDC3 provider: ${info.provider}, FDC3 version: ${info.fdc3Version}`);

    return window.fdc3
}