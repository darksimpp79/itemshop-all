# ItemShop SaaS - Architecture Improvements ✅

## Overview
Complete refactor implementing **Security**, **Code Quality**, and **Performance** improvements across the frontend application. All changes maintain backward compatibility with existing APIs.

---

## TIER 1: Security & Stability 🔒

### 1.1 Centralized API Client (`lib/api/client.ts`)
**Problem**: Hardcoded URLs scattered across components, no error handling standardization.

**Solution**:
- Single `ApiClient` class for all API communication
- Automatic request deduplication (prevents duplicate in-flight requests)
- 30s response caching for GET requests
- Proper error handling and status codes
- Future-proof auth header support

**Usage**:
```typescript
import { shopApi } from "@/lib/api/client";

const response = await shopApi.getProducts(serverName);
if (response.ok) {
  console.log(response.data);
} else {
  console.error(response.error);
}
```

### 1.2 Environment Variables
**Files**: `.env.example`, `.env.local`

**Setup**:
```bash
# .env.local (git-ignored)
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api

# For production:
# NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api
```

### 1.3 Response Validation (`lib/schemas.ts`)
**Problem**: No runtime validation of API responses could cause runtime crashes.

**Solution**:
- Type-safe validators for all API responses
- Graceful fallback handling
- Used in hooks for automatic validation

**Schemas**:
- `productSchema` - validates Product[]
- `shopModeSchema` - validates ShopMode[]
- `shopInfoSchema` - validates ShopInfo
- `rewardResponseSchema` - validates reward claims
- `checkoutResponseSchema` - validates payments

### 1.4 Error Handling
**Replaced**: `alert()` with proper UI components

**New Components**:
- `<ErrorBoundary>` - catches React errors globally
- `<ErrorAlert>` - displays error messages with dismiss button
- `<LoadingSpinner>` - consistent loading indicator

---

## TIER 2: Code Quality 📐

### 2.1 Type Definitions (`types/shop.ts`)
**Problem**: Widespread use of `any` type defeated TypeScript benefits.

**Solution**: Strict interfaces for all domain objects
```typescript
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  mode: string;
  imageUrl?: string;
  iconEmoji?: string;
}
```

### 2.2 Utilities (`lib/utils.ts`)
**Extracted**:
- `getModeStyle()` - Color/styling by game mode
- `decrementCooldown()` - Cooldown timer logic
- `detectServerName()` - Parse hostname/query params
- `validateMinecraftNick()` - Basic nick validation
- `getPaymentStatusFromUrl()` - Parse payment query params

### 2.3 Custom Hooks

#### `useShop(serverName, currentMode)`
Manages shop data fetching:
```typescript
const { products, modes, serverInfo, onlinePlayers, isLoading, error } = 
  useShop(serverName, currentMode);
```

- Parallel API requests
- Automatic MC server status polling
- Error state management

#### `useRewardCooldown()`
Manages reward cooldown timer:
```typescript
const { cooldown, setCooldown } = useRewardCooldown();
// Timer automatically decrements every 1s
```

#### `useLiveStats()`
Fetches platform statistics with fallback:
```typescript
const { shops, orders, revenue, loaded, error } = useLiveStats();
```

### 2.4 UI Components

#### `<ErrorBoundary>`
Catches and displays React errors:
```typescript
<ErrorBoundary fallback={(error) => <CustomError error={error} />}>
  <YourComponent />
</ErrorBoundary>
```

#### `<ErrorAlert>`
Displays dismissible error messages:
```typescript
<ErrorAlert error={error} onDismiss={() => setError(null)} />
```

#### `<LoadingSpinner>`
Consistent loading indicator:
```typescript
<LoadingSpinner message="Wczytywanie..." size="lg" />
```

---

## TIER 3: Performance & UX ⚡

### 3.1 Request Caching
**Built-in**: 30-second TTL caching in `ApiClient`

**Automatic**:
- GET requests cached
- Cache invalidated on timeout
- No manual cache management needed

### 3.2 Request Deduplication
**Problem**: Multiple rapid requests to same endpoint = wasted bandwidth.

**Solution**: Pending requests deduplicated at ApiClient level
```
1st call: fetch("/products") → network request
2nd call: fetch("/products") → returns pending promise
→ Both resolve with same data
```

### 3.3 Form Validation (`lib/validation.ts`)
**Problem**: Invalid user input reaches backend.

**Solution**: Client-side validation before submit
```typescript
const error = validatePlayerNick(nick);
if (error) {
  setNickError(error.message);
  return;
}
```

**Validators**:
- `validatePlayerNick()` - 3-16 chars, alphanumeric + underscore
- `validateProductSelection()` - Non-null product ID
- `validateMode()` - Non-empty mode
- `validatePrice()` - Positive price

### 3.4 Optimistic Updates (`hooks/useOptimisticUpdate.ts`)
**Problem**: UI feels slow waiting for API response.

**Solution**: Show optimistic state immediately, revert on error
```typescript
const { data, isPending, error, execute, reset } = useOptimisticUpdate(initialData);

// Show optimistic data while request is in flight
await execute(optimisticData, () => apiCall());
```

---

## Refactored Pages

### `/[theme]/shop/[mode]/page.tsx`
**Changes**:
- Use `useShop()` instead of manual fetch
- Use `shopApi` for all API calls
- Add client-side nick validation
- Replace alerts with UI error components
- Add proper loading and error states
- Type-safe Product handling

### `/app/page.tsx`
**Changes**:
- Extract `useLiveStats()` to dedicated hook
- Use centralized `apiClient`
- Improved error fallback handling

### Theme Components
**Updated**: `DefaultTheme.tsx`, `RpgThemes.tsx`, `RetroThemes.tsx`
- Proper TypeScript interfaces
- Removed inline logic
- Cleaner component signatures

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                 React Components                     │
│  (DefaultShopMode, RpgShopMode, etc.)              │
└────────┬──────────────────────────────┬─────────────┘
         │                              │
    ┌────▼──────────────┐     ┌────────▼────────┐
    │   Custom Hooks    │     │   UI Components │
    │ ─────────────     │     │ ─────────────── │
    │ useShop()         │     │ ErrorBoundary   │
    │ useRewardCooldown │     │ ErrorAlert      │
    │ useLiveStats()    │     │ LoadingSpinner  │
    │ useOptimisticUpd. │     │                 │
    └────┬──────────────┘     └────────┬────────┘
         │                             │
    ┌────▼────────────────────────────▼───────────┐
    │          API Abstraction Layer               │
    │ ─────────────────────────────────────────   │
    │ apiClient: class with caching, dedup       │
    │ shopApi: convenience functions              │
    │ schemas: runtime validation                 │
    │ validation: form validators                 │
    │ utils: shared utilities                     │
    └────┬───────────────────────────────────────┘
         │
    ┌────▼───────────────────┐
    │   Backend API           │
    │ (Spring + PaperMC)      │
    │ ─────────────────────  │
    │ /api/storefront/*       │
    │ /api/public/stats       │
    └────────────────────────┘
```

---

## File Structure

```
lib/
├── api/
│   └── client.ts          # ApiClient class + shopApi helpers
├── utils.ts               # Shared utility functions
├── schemas.ts             # Response validators
└── validation.ts          # Form validators

hooks/
├── useShop.ts            # Shop data fetching
├── useRewardCooldown.ts  # Cooldown timer
├── useLiveStats.ts       # Platform stats
└── useOptimisticUpdate.ts # Optimistic UI updates

components/
├── ui/
│   ├── ErrorBoundary.tsx  # Error boundary
│   ├── ErrorAlert.tsx     # Error display
│   └── LoadingSpinner.tsx # Loading indicator
└── themes/
    ├── DefaultTheme.tsx
    ├── RpgThemes.tsx
    └── RetroThemes.tsx

types/
└── shop.ts               # Type definitions

app/
├── page.tsx              # Landing page (refactored)
└── [theme]/shop/[mode]/
    └── page.tsx          # Shop page (refactored)
```

---

## Testing the Changes

### Build
```bash
npm run build
```
✅ All checks pass: TypeScript, ESLint, Next.js compilation

### Development
```bash
npm run dev
# Navigate to: http://localhost:3000
```

### Key Features to Test
1. **API Client Caching**: Navigate away and back - data loads from cache
2. **Request Deduplication**: Open DevTools Network tab, rapidly switch modes
3. **Form Validation**: Try invalid nicks (too short, special chars)
4. **Error Handling**: Disconnect network, see error UI instead of alert
5. **Loading States**: Slow 3G in DevTools, verify spinners appear

---

## Migration Guide

### For Existing Code
**Before**:
```typescript
const data = await fetch("http://127.0.0.1:8080/api/...");
```

**After**:
```typescript
import { shopApi } from "@/lib/api/client";
const response = await shopApi.getProducts(serverName);
if (response.ok) {
  // use response.data
}
```

### For New Features
Use provided hooks:
```typescript
import { useShop } from "@/hooks/useShop";
import { validatePlayerNick } from "@/lib/validation";
import { ErrorAlert, LoadingSpinner } from "@/components/ui";

function MyComponent() {
  const { products, isLoading, error } = useShop(serverName);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;
  
  return <div>{/* ... */}</div>;
}
```

---

## Future Improvements

### Phase 2
- [ ] Authentication/authorization layer
- [ ] Server-side rendering optimizations
- [ ] Stripe webhook validation
- [ ] Image optimization with Next.js Image component
- [ ] Request logging/monitoring

### Phase 3
- [ ] Internationalization (i18n)
- [ ] Advanced analytics
- [ ] A/B testing framework
- [ ] PWA support for offline capability

---

## Summary of Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Type Safety** | `any` everywhere | Strict interfaces |
| **API Calls** | Hardcoded, scattered | Centralized, cacheable |
| **Error Handling** | `alert()` popups | Proper UI components |
| **Network Efficiency** | Duplicate requests | Automatic deduplication |
| **Code Reusability** | Duplicated logic | Custom hooks |
| **Developer Experience** | Hard to debug | Clear error messages |
| **Performance** | No caching | 30s smart cache |
| **User Experience** | Sluggish errors | Graceful degradation |

---

## Build Status
✅ **All tests passing**
- TypeScript strict mode: PASS
- ESLint: PASS
- Next.js build: PASS

Generated: 2026-04-22
