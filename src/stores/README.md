# State Management Architecture

This document describes the optimized state management architecture using Pinia with enhanced caching and performance strategies.

## Store Structure

### Core Stores (`/core`)

Foundation stores that provide common functionality:

- `baseStore.ts` - Base store factory with common state management patterns
- `cacheManager.ts` - Global cache management with LRU/FIFO strategies

### Domain-Specific Stores

Organized by business domain:

#### User Management (`/user`)

- `authStore.ts` - Authentication and session management
- `membershipStore.ts` - Membership levels and permissions
- `profileStore.ts` - User profile and preferences

#### Stock Data (`/stock`)

- `stockDataStore.ts` - Stock information and market data
- `watchlistStore.ts` - User watchlists and favorites

#### Portfolio Management (`/portfolio`)

- `portfolioStore.ts` - Investment portfolios and holdings

#### Alerts (`/alert`)

- `alertStore.ts` - Price alerts and notifications

## Key Features

### 1. Base Store Pattern

All stores extend the base store functionality:

```typescript
const baseStore = createBaseStore({
  name: 'myStore',
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
    key: 'my_store',
  },
})()
```

**Features:**

- Unified error handling
- Loading state management
- Automatic caching with TTL
- Timestamp tracking
- Async operation wrapper

### 2. Enhanced Caching Strategy

#### Multi-Level Caching

1. **Store-level caching** - Individual store cache with TTL
2. **Global cache manager** - Shared cache across stores
3. **Browser storage** - Persistent cache for critical data

#### Cache Strategies

- **LRU (Least Recently Used)** - Default strategy
- **FIFO (First In, First Out)** - Alternative strategy
- **TTL-based expiration** - Time-based cache invalidation

#### Cache Management

```typescript
// Set cache with custom TTL
cacheManager.set('key', data, 10 * 60 * 1000) // 10 minutes

// Get cached data
const data = cacheManager.get('key')

// Clear cache by pattern
cacheManager.deleteByPattern(/^stock_/)

// Get cache statistics
const stats = cacheManager.getStats()
```

### 3. Pagination and Search

Common patterns for data listing:

```typescript
const pagination = createPaginationState()
const search = createSearchState()

// Use in store
return {
  ...pagination,
  ...search,
  // other store properties
}
```

### 4. Optimized Data Flow

#### Batch Operations

```typescript
// Batch fetch multiple stocks
const results = await fetchMultipleStockData(['AAPL', 'GOOGL', 'MSFT'])

// Batch update alerts
const results = await toggleMultipleAlertStatus([1, 2, 3], true)
```

#### Smart Updates

- Incremental updates instead of full reloads
- Optimistic updates with rollback
- Background refresh with stale-while-revalidate

## Performance Optimizations

### 1. Lazy Loading

Stores are loaded only when needed:

```typescript
// Dynamic import for code splitting
const { useStockDataStore } = await import('@/stores/stock/stockDataStore')
```

### 2. Memory Management

- Automatic cleanup of expired cache
- Configurable cache size limits
- Memory usage monitoring

### 3. Network Optimization

- Request deduplication
- Intelligent retry strategies
- Connection pooling

## Usage Examples

### Basic Store Usage

```typescript
import { useStockDataStore } from '@/stores'

const stockStore = useStockDataStore()

// Fetch with caching
await stockStore.fetchStocks({ forceRefresh: false })

// Search with pagination
stockStore.setQuery('AAPL')
stockStore.setPage(2)
await stockStore.fetchStocks()
```

### Advanced Caching

```typescript
import { globalCacheManager } from '@/stores/core/cacheManager'

// Custom cache with specific TTL
globalCacheManager.set('user_preferences', preferences, 24 * 60 * 60 * 1000)

// Batch operations
const stockData = globalCacheManager.getMultiple(['AAPL_1d', 'GOOGL_1d'])
```

### Error Handling

```typescript
const stockStore = useStockDataStore()

try {
  await stockStore.fetchStock('AAPL')
} catch (error) {
  // Error is automatically handled by base store
  console.log(stockStore.error) // User-friendly error message
}
```

## Migration Guide

### From Old Stores

The following stores have been consolidated:

#### Removed Stores

- `alertStore.ts` → Use `alert/alertStore.ts`
- `portfolioStore.ts` → Use `portfolio/portfolioStore.ts`
- `stockStore.ts` → Use `stock/stockDataStore.ts`
- `counter.ts` → Removed (template store)

#### Updated Imports

```typescript
// Old
import { useAlertStore } from '@/stores/alertStore'

// New
import { useAlertStore } from '@/stores/alert/alertStore'
// or
import { useAlertStore } from '@/stores'
```

### API Changes

Most APIs remain compatible, but some have been enhanced:

```typescript
// Enhanced with options
await stockStore.fetchStocks({
  forceRefresh: true,
  page: 1,
  pageSize: 50,
})

// New batch operations
await alertStore.deleteMultipleAlerts([1, 2, 3])
```

## Best Practices

### 1. Store Organization

- Keep stores focused on single domains
- Use composition over inheritance
- Implement clear separation of concerns

### 2. Caching Strategy

- Set appropriate TTL based on data volatility
- Use cache keys that include relevant parameters
- Implement cache invalidation strategies

### 3. Error Handling

- Use the base store's error handling
- Provide user-friendly error messages
- Implement retry mechanisms for transient errors

### 4. Performance

- Use pagination for large datasets
- Implement virtual scrolling for UI
- Batch API calls when possible

### 5. Testing

- Mock stores in unit tests
- Test cache behavior
- Verify error handling paths

## Monitoring and Debugging

### Cache Statistics

```typescript
const stats = globalCacheManager.getStats()
console.log('Cache hit rate:', stats.hitRate)
console.log('Cache size:', stats.total)
```

### Store State Inspection

```typescript
// In development mode
if (import.meta.env.DEV) {
  window.stores = {
    stock: useStockDataStore(),
    portfolio: usePortfolioStore(),
    // ... other stores
  }
}
```

### Performance Monitoring

- Track API response times
- Monitor cache hit rates
- Measure memory usage
- Log slow operations
