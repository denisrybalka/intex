import { Plugin } from "./base";
import { CachePlugin } from "../types/plugins";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCachePlugin extends Plugin implements CachePlugin {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtl: number;

  constructor(config: {
    id: string;
    name: string;
    description: string;
    defaultTtl?: number; // Time to live in milliseconds
  }) {
    super(config);
    this.defaultTtl = config.defaultTtl || 60 * 1000; // Default 1 minute
  }

  async initialize(): Promise<void> {
    // Nothing to initialize for memory cache
    console.log(`Cache plugin ${this.id} initialized`);
  }

  async shutdown(): Promise<void> {
    this.cache.clear();
    console.log(`Cache plugin ${this.id} shut down`);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.defaultTtl);

    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
