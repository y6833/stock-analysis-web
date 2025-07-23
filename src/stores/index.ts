// Unified Store Exports
// This file provides a single entry point for all optimized stores

// Core stores
export { createBaseStore, createPaginationState, createSearchState } from './core/baseStore'

// User stores
export { useAuthStore } from './user/authStore'
export { useMembershipStore } from './user/membershipStore'
export { useProfileStore } from './user/profileStore'

// Stock stores
export { useStockDataStore } from './stock/stockDataStore'
export { useWatchlistStore } from './stock/watchlistStore'

// Portfolio stores
export { usePortfolioStore } from './portfolio/portfolioStore'

// Alert stores
export { useAlertStore } from './alert/alertStore'

// Other stores
export { useDashboardStore } from './dashboardStore'
export { useDataSourceStore } from './dataSourceStore'
export { useUserStore } from './userStore'

// Store types
export type { BaseStoreState, CacheConfig, StoreOptions } from './core/baseStore'