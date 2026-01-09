interface CacheEntry {
  completion: string;
  timestamp: number;
}

export class CompletionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttl: number; // Time to live in ms

  constructor(maxSize = 50, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  private generateKey(text: string, cursorPosition: number): string {
    // Sadece son 200 karakteri key olarak kullan
    const relevantText = text.substring(Math.max(0, cursorPosition - 200), cursorPosition);
    return relevantText.trim();
  }

  get(text: string, cursorPosition: number): string | null {
    const key = this.generateKey(text, cursorPosition);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.completion;
  }

  set(text: string, cursorPosition: number, completion: string): void {
    const key = this.generateKey(text, cursorPosition);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      completion,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Prefix-based lookup for partial matches
  getByPrefix(text: string, cursorPosition: number): string | null {
    const key = this.generateKey(text, cursorPosition);

    // Check exact match first
    const exact = this.get(text, cursorPosition);
    if (exact) return exact;

    // Check if any cached completion starts with what user is typing
    for (const [cachedKey, entry] of this.cache.entries()) {
      if (Date.now() - entry.timestamp > this.ttl) continue;

      // If cached key is a prefix of current key, and we have a completion
      if (key.startsWith(cachedKey) && entry.completion) {
        // Return the relevant part of the completion
        const extraTyped = key.slice(cachedKey.length);
        if (entry.completion.startsWith(extraTyped)) {
          return entry.completion.slice(extraTyped.length);
        }
      }
    }

    return null;
  }
}

// Singleton instance
export const completionCache = new CompletionCache();
