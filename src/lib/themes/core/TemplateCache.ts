// Template cache for parsed Liquid templates

import type { Template } from 'liquidjs';

interface CacheEntry {
  template: Template[];
  timestamp: number;
}

export class TemplateCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxAge: number; // milliseconds

  constructor(maxAge: number = 5 * 60 * 1000) { // Default 5 minutes
    this.maxAge = maxAge;
  }

  /**
   * Get a cached template by key
   */
  get(key: string): Template[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.template;
  }

  /**
   * Store a template in the cache
   */
  set(key: string, template: Template[]): void {
    this.cache.set(key, {
      template,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a specific entry from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached templates
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of cached entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance for global template caching
export const templateCache = new TemplateCache();
