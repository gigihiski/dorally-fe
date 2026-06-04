import { beforeEach, vi } from "vitest";

// Node 25 ships an experimental localStorage and happy-dom's storage shim
// doesn't always present the full Storage interface in this environment.
// Replace with a deterministic in-memory polyfill before each test.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

beforeEach(() => {
  const fresh = new MemoryStorage();
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: fresh,
      writable: true,
      configurable: true,
    });
  }
  Object.defineProperty(globalThis, "localStorage", {
    value: fresh,
    writable: true,
    configurable: true,
  });
  vi.restoreAllMocks();
});
