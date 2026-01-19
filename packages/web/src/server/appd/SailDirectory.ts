import fs from 'node:fs/promises';
import { BasicDirectory, DirectoryApp } from "@finos/fdc3-sail-da-impl";

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

export class SailDirectory extends BasicDirectory {

    constructor() {
        super([])
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
    }

    retrieveAppsByUrl(url: string): DirectoryApp[] {
        return this.retrieveAllApps().filter(a => a.type == 'web' && (a.details as any).url == url);
    }

}