import IOBrowser from "@interopio/browser";
import "@interopio/fdc3";
import { DesktopAgent } from "@finos/fdc3";
import IOBrowserWidget from "@interopio/widget";
import "@interopio/widget/styles";

export async function ioConnectClientSetup(): Promise<DesktopAgent> {


    const config = {
        libraries: [IOBrowserWidget],
        // Optional configuration for the widget.
        widget: {
            displayInWorkspace: true,
            position: 'bottom',
            mode: 'compact'
        }
    } as any

    const io = await IOBrowser(config);

    // The FDC3 API will now be available as an `fdc3` object injected in the global `window` object.
    const info = await window.fdc3.getInfo();

    console.log(`FDC3 provider: ${info.provider}, FDC3 version: ${info.fdc3Version}`);

    return window.fdc3
}