declare global {
  interface Window {
    indexedDB: any;
    localStorage: Storage;
  }
}

export function isBrowser(): boolean {
  return typeof globalThis !== 'undefined' && 
         typeof (globalThis as any).window !== 'undefined' && 
         typeof (globalThis as any).window.document !== 'undefined';
}

export function hasIndexedDB(): boolean {
  return isBrowser() && 'indexedDB' in (globalThis as any).window;
}

export function hasLocalStorage(): boolean {
  try {
    return isBrowser() && 
           'localStorage' in (globalThis as any).window && 
           (globalThis as any).window.localStorage !== null;
  } catch {
    return false;
  }
}