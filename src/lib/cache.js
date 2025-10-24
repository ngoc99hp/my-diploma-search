// src/lib/cache.js - WITH TRACKING
class SimpleCache {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
  }

  generateKey(type, ...args) {
    return `${type}:${args.join(':')}`;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });

    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      ttl: this.ttl,
      hits: this.hits,
      misses: this.misses,
      total: total,
      hitRate: `${hitRate}%`
    };
  }
}

export const searchCache = new SimpleCache(300000);
export default SimpleCache;