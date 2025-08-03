import { hasIndexedDB, hasLocalStorage, isBrowser } from './browser-detect.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface EdgeCacheOptions {
  defaultTTL?: number;
  maxSize?: number;
  storage?: 'memory' | 'localStorage' | 'indexedDB';
}

export class EdgeCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private options: Required<EdgeCacheOptions>;
  private dbName = 'asset-valuator-cache';
  private storeName = 'prices';
  private db: any = null;

  constructor(options: EdgeCacheOptions = {}) {
    this.options = {
      defaultTTL: options.defaultTTL || 60000, // 60 seconds
      maxSize: options.maxSize || 1000,
      storage: options.storage || 'memory'
    };

    if (this.options.storage === 'indexedDB' && hasIndexedDB()) {
      this.initIndexedDB();
    }
  }

  private async initIndexedDB(): Promise<void> {
    try {
      const request = (globalThis as any).window.indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = (event: any) => {
        const db = (event.target as any).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };

      this.db = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('IndexedDB initialization failed, falling back to memory cache', error);
      this.options.storage = 'memory';
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    switch (this.options.storage) {
      case 'localStorage':
        if (hasLocalStorage()) {
          try {
            const stored = localStorage.getItem(`cache_${key}`);
            if (stored) {
              const entry: CacheEntry<T> = JSON.parse(stored);
              if (now - entry.timestamp < entry.ttl) {
                return entry.data;
              }
              localStorage.removeItem(`cache_${key}`);
            }
          } catch (error) {
            console.warn('localStorage read failed', error);
          }
        }
        break;

      case 'indexedDB':
        if (this.db) {
          try {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            const result = await new Promise<any>((resolve, reject) => {
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });

            if (result && now - result.timestamp < result.ttl) {
              return result.data;
            }

            // Clean up expired entry
            if (result) {
              this.delete(key);
            }
          } catch (error) {
            console.warn('IndexedDB read failed', error);
          }
        }
        break;

      default: // memory
        const entry = this.memoryCache.get(key);
        if (entry && now - entry.timestamp < entry.ttl) {
          return entry.data;
        }
        if (entry) {
          this.memoryCache.delete(key);
        }
    }

    return null;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL
    };

    switch (this.options.storage) {
      case 'localStorage':
        if (hasLocalStorage()) {
          try {
            localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
            
            // Enforce max size for localStorage
            if (localStorage.length > this.options.maxSize) {
              this.evictOldest();
            }
          } catch (error) {
            console.warn('localStorage write failed', error);
            // Fall back to memory cache
            this.memoryCache.set(key, entry);
          }
        }
        break;

      case 'indexedDB':
        if (this.db) {
          try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            await new Promise<void>((resolve, reject) => {
              const request = store.put({ key, ...entry });
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          } catch (error) {
            console.warn('IndexedDB write failed', error);
            // Fall back to memory cache
            this.memoryCache.set(key, entry);
          }
        }
        break;

      default: // memory
        this.memoryCache.set(key, entry);
        
        // Enforce max size for memory cache
        if (this.memoryCache.size > this.options.maxSize) {
          const firstKey = this.memoryCache.keys().next().value as string;
          this.memoryCache.delete(firstKey);
        }
    }
  }

  async delete(key: string): Promise<void> {
    switch (this.options.storage) {
      case 'localStorage':
        if (hasLocalStorage()) {
          localStorage.removeItem(`cache_${key}`);
        }
        break;

      case 'indexedDB':
        if (this.db) {
          try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.delete(key);
          } catch (error) {
            console.warn('IndexedDB delete failed', error);
          }
        }
        break;

      default:
        this.memoryCache.delete(key);
    }
  }

  async clear(): Promise<void> {
    switch (this.options.storage) {
      case 'localStorage':
        if (hasLocalStorage()) {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith('cache_')) {
              localStorage.removeItem(key);
            }
          });
        }
        break;

      case 'indexedDB':
        if (this.db) {
          try {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            store.clear();
          } catch (error) {
            console.warn('IndexedDB clear failed', error);
          }
        }
        break;

      default:
        this.memoryCache.clear();
    }
  }

  private evictOldest(): void {
    if (hasLocalStorage()) {
      const cacheKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'))
        .map(key => {
          try {
            const entry = JSON.parse(localStorage.getItem(key) || '{}');
            return { key, timestamp: entry.timestamp || 0 };
          } catch {
            return { key, timestamp: 0 };
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 10% of entries
      const toRemove = Math.ceil(cacheKeys.length * 0.1);
      cacheKeys.slice(0, toRemove).forEach(({ key }) => {
        localStorage.removeItem(key);
      });
    }
  }
}