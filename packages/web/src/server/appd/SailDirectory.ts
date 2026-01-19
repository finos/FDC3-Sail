import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { BasicDirectory, DirectoryApp } from "@finos/fdc3-sail-da-impl";
import { FDC3_WEBSOCKET_PROPERTY } from '@finos/fdc3-sail-common';

/* eslint-disable  @typescript-eslint/no-explicit-any */

export const DEFAULT_ICON = "/icons/control/choose-app.svg"

export function getIcon(a: DirectoryApp | undefined) {
    if (a) {
        const icons = a.icons ?? []
        if (icons.length > 0) {
            return icons[0].src
        }
    }

    return DEFAULT_ICON
}

function loadRemotely(u: string): Promise<any> {
    return fetch(u).then((response) => response.json());
}

async function loadFile(u: string): Promise<any> {
    const data = await fs.readFile(u, { encoding: 'utf8' });
    return JSON.parse(data);
}

async function load(url: string): Promise<DirectoryApp[]> {
    if (url.startsWith('http')) {
        return await loadRemotely(url).then(convertToDirectoryList);
    } else {
        return await loadFile(url).then(convertToDirectoryList);
    }
}

const convertToDirectoryList = (data: any) => {
    return data.applications as DirectoryApp[];
}


/**
 * Handles local and remote url loading, and also specifies a connectionURL for native 
 * apps.
 */
export class SailDirectory extends BasicDirectory {

    private readonly urlBase: string

    /**
     * 
     * @param urlBase Should be in the form http(s)://<host>:<port>/remote/<userSessionId>
     */
    constructor(urlBase: string) {
        super([])
        this.urlBase = urlBase
    }

    async load(url: string): Promise<void> {
        try {
            const apps = await load(url)
            console.log(`Loaded ${apps.length} apps from`, url)
            apps.forEach((a) => {
                // ensure we don't have two apps with same appId
                if (!this.allApps.find(a2 => a2.appId == a.appId)) {
                    this.allApps.push(a)
                }
            })
            this.setNativeAppConnectionUrls()
        } catch (e) {
            console.error(`Error loading`, e)
        }
    }

    /**
     * Replaces the loaded apps with new ones
     */
    async replace(url: string[]) {
        this.allApps = []
        for (const u of url) {
            await this.load(u)
        }
        console.log("Loaded " + this.allApps.length + " apps")
    }

    add(d: DirectoryApp) {
        this.allApps.push(d)
        this.setNativeAppConnectionUrls()
    }

    retrieveAppsByUrl(url: string): DirectoryApp[] {
        return this.retrieveAllApps().filter(a => a.type == 'web' && (a.details as any).url == url);
    }

    /**
     * Use a hash for the remote id so it's consistent across SailDirectory reloads.
     */
    private hashApplicationExtensionId(appId: string): string {
        const data = `${this.urlBase}:${appId}`
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
    }

    /**
     * Sets the connectionUrl for all native apps in the directory.
     * The connectionUrl format is: {urlBase}/remote/{userSessionId}/{applicationExtensionId}
     * where applicationExtensionId is a secure hash to prevent nefarious connnections.
     */
    private setNativeAppConnectionUrls(): void {
        this.allApps.forEach(app => {
            if (app.type === 'native') {
                const applicationExtensionId = this.hashApplicationExtensionId(app.appId!)
                const connectionUrl = `${this.urlBase}/${applicationExtensionId}`;
                (app.details as any)[FDC3_WEBSOCKET_PROPERTY] = connectionUrl
            }
        })
    }

}