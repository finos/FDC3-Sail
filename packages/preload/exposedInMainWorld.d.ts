interface Window {
    readonly agentChannelPicker: { joinChannel: (channel: string) => void; hideWindow: () => void; leaveChannel: () => void; };
    readonly versions: NodeJS.ProcessVersions;
    readonly agentFrame: { isConnected: () => boolean; selectTab: (selectedId: string) => void; tearOutTab: (tabId: string) => void; openToolsMenu: (clientX: number, clientY: number) => void; isReady: () => void; newTab: () => void; openChannelPicker: (mouseX: number, mouseY: number) => void; hideResultsWindow: () => void; searchDirectory: (query: string) => void; dropTab: (frameTarget: boolean) => void; tabDragStart: (selected: string) => void; closeTab: (tabId: string) => void; };
    readonly home: { getApps: () => Promise<unknown>; };
    readonly fdc3: import("/Users/nicholaskolba/connectifi/electron-fdc3/node_modules/@finos/fdc3/dist/api/DesktopAgent").DesktopAgent;
    readonly agentResolver: { resolveIntent: (data: any) => void; };
    readonly agentSearch: { selectResult: (selection: string) => void; };
}
