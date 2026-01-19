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
    private currentUrlsJson: string = '[]'
    private currentCustomAppsJson: string = '[]'

    /**
     * 
     * @param urlBase Should be in the form ws(s)://<host>:<port>/remote/<userSessionId>
     */
    constructor(urlBase: string) {
        super([])
        this.urlBase = urlBase
    }

    /**
     * Refresh the directory with the given URLs and custom apps.
     * Only reloads if something has actually changed to avoid race conditions.
     * The update is atomic - allApps is replaced in a single assignment.
     */
    async refresh(urls: string[], customApps: DirectoryApp[]): Promise<void> {
        // Capture JSON of inputs BEFORE any modifications (to avoid connectionUrl affecting comparison)
        const urlsJson = JSON.stringify(urls)
        const customAppsJson = JSON.stringify(customApps)

        if (this.currentUrlsJson == urlsJson && this.currentCustomAppsJson == customAppsJson) {
            return // Nothing changed
        }

        console.log("Directory refresh triggered")

        // Build new apps array
        const newApps: DirectoryApp[] = []

        // Load apps from URLs
        for (const u of urls) {
            const apps = await this.loadFromUrl(u)
            apps.forEach(a => {
                if (!newApps.find(a2 => a2.appId == a.appId)) {
                    newApps.push(a)
                }
            })
        }

        // Deep copy custom apps to avoid modifying the originals when we set connectionUrl
        const customAppsCopy: DirectoryApp[] = JSON.parse(customAppsJson)
        customAppsCopy.forEach(a => {
            if (!newApps.find(a2 => a2.appId == a.appId)) {
                newApps.push(a)
            }
        })

        // Set connection URLs for native apps
        newApps.forEach(app => {
            if (app.type === 'native') {
                const applicationExtensionId = this.hashApplicationExtensionId(app.appId!);
                (app.details as any)[FDC3_WEBSOCKET_PROPERTY] = `${this.urlBase}/${applicationExtensionId}`
            }
        })

        // Atomic replacement
        this.allApps = newApps
        this.currentUrlsJson = urlsJson
        this.currentCustomAppsJson = customAppsJson

        console.log("Directory refreshed: " + this.allApps.length + " total apps")
    }

    private async loadFromUrl(url: string): Promise<DirectoryApp[]> {
        try {
            const apps = await load(url)
            console.log(`Loaded ${apps.length} apps from`, url)
            return apps
        } catch (e) {
            console.error(`Error loading from ${url}:`, e)
            return []
        }
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

}