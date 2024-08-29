import fs from 'node:fs/promises';
import { DirectoryApp } from './DirectoryInterface';
import { BasicDirectory } from './BasicDirectory';

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

    async load(url: string) {
        this.allApps.push(...await load(url));
    }

    /**
     * Replaces the loaded apps with new ones
     */
    async replace(url: string[]) {
        this.allApps = []
        url.forEach(u => load(u))
    }
}