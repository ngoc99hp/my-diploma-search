// src/lib/cache.js - WITH INVALIDATION & NORMALIZATION

class SimpleCache {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
    
    // ✅ NEW: Track tags for invalidation
    this.tags = new Map(); // tag → Set of cache keys
  }

  /**
   * ✅ FIXED: Normalize arguments để tránh cache miss không cần thiết
   */
  generateKey(type, ...args) {
    const normalizedArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return arg
          .trim()                    // Remove whitespace
          .toUpperCase()             // Uppercase (vì DB dùng UPPER())
          .replace(/\s+/g, ' ');     // Normalize multiple spaces → single space
      }
      return arg;
    });
    
    return `${type}:${normalizedArgs.join(':')}`;
  }

  /**
   * Get item from cache
   */
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

  /**
   * ✅ ENHANCED: Set with optional tags for invalidation
   * @param {string} key - Cache key
   * @param {*} value - Data to cache
   * @param {Object} options - Options
   * @param {string[]} options.tags - Tags for group invalidation
   */
  set(key, value, options = {}) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
      tags: options.tags || []
    });

    // ✅ NEW: Track tags
    if (options.tags && Array.isArray(options.tags)) {
      options.tags.forEach(tag => {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag).add(key);
      });
    }

    // Auto-cleanup if too many items
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }
  }

  /**
   * Delete single key
   */
  delete(key) {
    const item = this.cache.get(key);
    
    // Remove from tags
    if (item && item.tags) {
      item.tags.forEach(tag => {
        const tagSet = this.tags.get(tag);
        if (tagSet) {
          tagSet.delete(key);
          if (tagSet.size === 0) {
            this.tags.delete(tag);
          }
        }
      });
    }
    
    this.cache.delete(key);
  }

  /**
   * ✅ NEW: Invalidate by tag
   * @param {string} tag - Tag to invalidate
   * @returns {number} Number of keys deleted
   */
  invalidateByTag(tag) {
    const keys = this.tags.get(tag);
    if (!keys) return 0;

    let count = 0;
    keys.forEach(key => {
      this.cache.delete(key);
      count++;
    });

    this.tags.delete(tag);
    console.log(`🗑️ Invalidated ${count} cache entries for tag: ${tag}`);
    return count;
  }

  /**
   * ✅ NEW: Invalidate by multiple tags
   * @param {string[]} tags - Array of tags
   * @returns {number} Total keys deleted
   */
  invalidateByTags(tags) {
    let totalCount = 0;
    tags.forEach(tag => {
      totalCount += this.invalidateByTag(tag);
    });
    return totalCount;
  }

  /**
   * ✅ NEW: Invalidate by pattern (regex)
   * @param {RegExp} pattern - Pattern to match keys
   * @returns {number} Number of keys deleted
   */
  invalidateByPattern(pattern) {
    let count = 0;
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.delete(key);
      count++;
    });

    console.log(`🗑️ Invalidated ${count} cache entries matching pattern: ${pattern}`);
    return count;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.tags.clear();
    this.hits = 0;
    this.misses = 0;
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(2) : 0;
    
    return {
      size: this.cache.size,
      ttl: this.ttl,
      hits: this.hits,
      misses: this.misses,
      total: total,
      hitRate: `${hitRate}%`,
      tags: this.tags.size,
      avgKeysPerTag: this.tags.size > 0 
        ? (Array.from(this.tags.values()).reduce((sum, set) => sum + set.size, 0) / this.tags.size).toFixed(2)
        : 0
    };
  }

  /**
   * ✅ NEW: Get all keys for a tag
   */
  getKeysByTag(tag) {
    return Array.from(this.tags.get(tag) || []);
  }

  /**
   * ✅ NEW: Get all tags
   */
  getAllTags() {
    return Array.from(this.tags.keys());
  }
}

// Export singleton instance
export const searchCache = new SimpleCache(300000); // 5 minutes

export default SimpleCache;