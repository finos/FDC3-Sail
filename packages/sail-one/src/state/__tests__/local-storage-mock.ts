/** Node 25 ships a partial localStorage that breaks jsdom; replace it for tests. */
export function installLocalStorage(): void {
  const store = new Map<string, string>()
  const localStorageMock: Storage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: key => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: index => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: localStorageMock,
  })
}
