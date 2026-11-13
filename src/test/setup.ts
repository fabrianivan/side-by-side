import '@testing-library/jest-dom';

function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

// Node 25+ defines experimental localStorage/sessionStorage getters without a backing file in tests.
for (const key of ['localStorage', 'sessionStorage'] as const) {
  const existing = (globalThis as Record<string, unknown>)[key] as Partial<Storage> | undefined;
  if (!existing || typeof existing.clear !== 'function' || typeof existing.setItem !== 'function') {
    const mock = createMemoryStorage();
    Object.defineProperty(globalThis, key, { value: mock, configurable: true, writable: true });
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, key, { value: mock, configurable: true, writable: true });
    }
  }
}

if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
