import { ContextTypes, Intents } from "@finos/fdc3-standard-v3"
import { getServerState } from "../state"

export const CONTEXT_TYPES: string[] = Object.values(ContextTypes)

export const intentTypes = Object.values(Intents).map(name => ({
  title: name,
  value: name,
}))

export function getAllContextTypes(): string[] {
  const allContexts: string[] = [...CONTEXT_TYPES]
  getServerState()
    .getKnownApps()
    .forEach(a => {
      if (a.interop?.userChannels) {
        allContexts.push(...(a.interop.userChannels.listensFor ?? []))
        allContexts.push(...(a.interop.userChannels.broadcasts ?? []))
      }
      if (a.interop?.appChannels) {
        a.interop.appChannels.forEach(ac => {
          allContexts.push(...(ac.broadcasts ?? []))
          allContexts.push(...(ac.listensFor ?? []))
        })
      }
      if (a.interop?.intents?.listensFor) {
        Object.values(a.interop.intents.listensFor).forEach(v => {
          allContexts.push(...v.contexts)
        })
      }
      if (a.interop?.intents?.raises) {
        Object.values(a.interop.intents.raises).forEach(v => {
          allContexts.push(...v)
        })
      }
    })

  const unique = [...new Set(allContexts)]
  return unique.sort()
}

export function getAllIntentNames(): string[] {
  const allIntents: string[] = Object.values(Intents)

  getServerState()
    .getKnownApps()
    .forEach(a => {
      if (a.interop?.intents?.listensFor) {
        allIntents.push(...Object.keys(a.interop.intents.listensFor))
      }
      if (a.interop?.intents?.raises) {
        allIntents.push(...Object.keys(a.interop.intents.raises))
      }
    })

  const unique = [...new Set(allIntents)]
  return unique.sort()
}
