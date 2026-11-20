export enum AppHosting {
  Frame,
  Tab,
}

export type PendingHosting = {
  hosting: AppHosting
  instanceTitle: string
}
