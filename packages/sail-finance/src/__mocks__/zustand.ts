import { act } from "@testing-library/react"
import { vi } from "vite-plus/test"

const { create: actualCreate, createStore: actualCreateStore } =
  await vi.importActual<typeof import("zustand")>("zustand")

export const storeResetFns = new Set<() => void>()

const createUncurried = (stateCreator: unknown) => {
  const store = actualCreate(stateCreator as never)
  const initialState = store.getState()
  storeResetFns.add(() => {
    store.setState(initialState, true)
  })
  return store
}

export const create = ((stateCreator: unknown) => {
  console.log("Zustand create called:", typeof stateCreator)

  // Check if stateCreator is a function that should be curried
  if (typeof stateCreator === "function" && stateCreator.length > 1) {
    return createUncurried(stateCreator)
  }

  // Handle curried stores
  return (...a: unknown[]) =>
    createUncurried((stateCreator as (...args: unknown[]) => unknown)(...a))
}) as typeof actualCreate

export const createStore = ((stateCreator: unknown) => {
  console.log("Zustand createStore called:", typeof stateCreator)
  const store = actualCreateStore(stateCreator as never)
  const initialState = store.getState()
  storeResetFns.add(() => {
    store.setState(initialState, true)
  })
  return store
}) as typeof actualCreateStore

export const resetAllStores = () => {
  act(() => {
    storeResetFns.forEach(resetFn => {
      resetFn()
    })
  })
}
