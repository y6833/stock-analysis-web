# Component Architecture

This document describes the refactored component architecture that follows modular and reusable design principles.

## Component Structure

### Base Components (`/base`)

Foundation components that provide basic functionality:

- `BaseButton.vue` - Unified button component with consistent styling
- `BaseSearchInput.vue` - Reusable search input with autocomplete functionality

### Common Components (`/common`)

Unified components that consolidate similar functionality:

- `UnifiedRefreshButton.vue` - Main refresh button with cooldown and status
- `UnifiedStockSearch.vue` - Stock search with unified interface
- `UnifiedWatchlistManager.vue` - Complete watchlist management solution

### Specialized Components

Domain-specific components organized by functionality:

- `/alerts` - Alert and notification components
- `/analysis` - Technical analysis components
- `/charts` - Chart and visualization components
- `/dashboard` - Dashboard widgets and panels
- `/technical-analysis` - Technical analysis tools

## Unified Component Interface

### UnifiedRefreshButton

Consolidates all refresh functionality with:

- Configurable cooldown periods
- Status tooltips
- Multiple refresh strategies
- API call management

**Usage:**

```vue
<UnifiedRefreshButton
  :refresh-action="myRefreshFunction"
  :show-tooltip="true"
  button-text="Refresh Data"
  @refresh-success="handleSuccess"
/>
```

### UnifiedStockSearch

Provides consistent stock search across the application:

- Autocomplete functionality
- Customizable result display
- Event-driven architecture
- Keyboard navigation

**Usage:**

```vue
<UnifiedStockSearch placeholder="Search stocks..." @select="handleStockSelect" />
```

### UnifiedWatchlistManager

Complete watchlist management solution:

- Multiple watchlist support
- Drag and drop functionality
- Bulk operations
- Real-time updates

**Usage:**

```vue
<UnifiedWatchlistManager
  :watchlists="watchlists"
  :active-watchlist-id="activeId"
  @watchlist-created="handleCreate"
/>
```

## Component Consolidation

The following redundant components have been removed and consolidated:

### Removed Components

- `RefreshButton.vue` → Use `UnifiedRefreshButton.vue`
- `BaseRefreshButton.vue` → Use `UnifiedRefreshButton.vue`
- `StockSearch.vue` → Use `UnifiedStockSearch.vue`
- `WatchlistManager.vue` → Use `UnifiedWatchlistManager.vue`
- `HelloWorld.vue` → Removed (template component)
- `TheWelcome.vue` → Removed (template component)
- `WelcomeItem.vue` → Removed (template component)
- `Toast.vue` → Use `MessageToast.vue`

### Specialized Wrappers

Some components remain as thin wrappers for specific use cases:

- `DataRefreshButton.vue` - Wraps UnifiedRefreshButton for data refresh
- `CacheRefreshButton.vue` - Wraps UnifiedRefreshButton for cache refresh

## Design Principles

### 1. Single Responsibility

Each component has a clear, single purpose and well-defined interface.

### 2. Reusability

Components are designed to be reusable across different contexts with minimal configuration.

### 3. Consistency

All components follow consistent naming conventions, prop interfaces, and event patterns.

### 4. Modularity

Components are loosely coupled and can be easily composed together.

### 5. Performance

Components implement efficient rendering strategies and avoid unnecessary re-renders.

## Migration Guide

### From RefreshButton to UnifiedRefreshButton

```vue
<!-- Old -->
<RefreshButton :refresh-action="refresh" :cooldown-period="60000" />

<!-- New -->
<UnifiedRefreshButton :refresh-action="refresh" :cooldown-period="60000" :show-text="true" />
```

### From StockSearch to UnifiedStockSearch

```vue
<!-- Old -->
<StockSearch @select="handleSelect" />

<!-- New -->
<UnifiedStockSearch @select="handleSelect" />
```

### From WatchlistManager to UnifiedWatchlistManager

```vue
<!-- Old -->
<WatchlistManager :watchlists="watchlists" @save="handleSave" />

<!-- New -->
<UnifiedWatchlistManager
  :watchlists="convertedWatchlists"
  :active-watchlist-id="activeId"
  @update:watchlists="handleUpdate"
/>
```

## Best Practices

1. **Import from index**: Use the common index file for imports

   ```ts
   import { UnifiedRefreshButton, UnifiedStockSearch } from '@/components/common'
   ```

2. **Props validation**: Always define prop types and defaults
3. **Event naming**: Use consistent event naming patterns
4. **Documentation**: Document component props, events, and slots
5. **Testing**: Write unit tests for component behavior
