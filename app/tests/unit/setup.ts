/* Node has no localStorage or screen; the data layer needs the first, the crash log the rest. */
import { beforeEach } from 'vitest';

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
}
const g = globalThis as any;
g.localStorage = new MemStorage();
Object.defineProperty(g, 'navigator', { value: { userAgent: 'vitest', language: 'en-IN' }, configurable: true, writable: true });
g.screen = g.screen || { width: 390, height: 844 };
g.window = g.window || { devicePixelRatio: 2, matchMedia: () => ({ matches: false }), addEventListener() { /* no DOM */ } };
g.location = g.location || { hash: '#dashboard', hostname: 'localhost' };

beforeEach(() => { localStorage.clear(); });
