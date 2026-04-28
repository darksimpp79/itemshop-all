# 🔍 ItemShop Admin Panel - Analiza & Rekomendacje

## 📋 Przegląd struktury

### Frontend (`/app/admin/`)
- **`/app/admin/page.tsx`** — Hub administracyjny (profil + lista serwerów)
- **`/app/admin/shop/[shopId]/page.tsx`** — Panel zarządzania sklepem (produkty, zamówienia, statystyki)

### Backend (`/api/admin/*`)
- `AdminController.java` — Wszystkie endpointy dla zarządzania sklepami

---

## ✅ Co działa dobrze

### 🎯 Backend
1. **Separacja autentykacji**
   - JWT tokens dla auth
   - API keys dla shop-specific operations
   - Dwu-poziomowa weryfikacja autoryzacji (`currentEmail()` + `withOwnedShop()`)

2. **Performance considerations**
   - Paginacja w `/zamowienia` (default 20, max 100)
   - `PageRequest` zamiast `findAll()` dla dużych zbiorów
   - SQL COUNT queries zamiast ładowania całych tabel

3. **Walidacja domeny**
   - Regex sprawdzenie formatu
   - DNS verification via Cloudflare
   - Zapobieganie localhost/http://

4. **CSV Export**
   - BOM UTF-8 dla polskich znaków
   - Proper CSV escaping

### 🎨 Frontend
1. **UX Pattern**
   - Sidebar navigation (servers/profile)
   - Toast notifications
   - Loading states
   - Drag & drop produktów

2. **Auth flow**
   - Register/Login/2FA w jednym componencie
   - Resend code cooldown
   - Token persistence w localStorage

3. **Shop management**
   - Onboarding system
   - Payment success handler
   - Plan-aware UI (FREE vs PRO limits)

---

## ⚠️ Znalezione problemy & Suggestions

### 🔴 KRYTYCZNE

#### 1. **Niepopatrzona paginacja w statystykach** (backend)
```java
// ❌ PROBLEM w getChartData i getDashboardStats
Page<PendingItem> allPage = itemRepository.findByShop(shop, 
  PageRequest.of(0, Integer.MAX_VALUE)); // 💥 Ładuje WSZYSTKO do RAM!
```
**Wpływ:** Sklep z 100k+ zamówieniami = OutOfMemoryError  
**Fix:**
```java
// Zamiast tego użyć dedicated queries:
@Query("SELECT COUNT(*) FROM PendingItem WHERE shop = ?1 AND claimed = true")
long countClaimedByShop(Shop shop);

// Dla chart data — bierz z `createdAt` limit (7 dni)
List<PendingItem> recentItems = itemRepository
  .findByShopAndCreatedAtAfter(shop, since);
```

#### 2. **CORS/API Key exposure** (frontend)
```typescript
// ⚠️ apiKey jest wysyłany w fetchach jako string
fetch(`/api/admin/produkty?apiKey=${apiKey}`, ...)
```
**Problem:** API key w URL = logger exposure, history leaks  
**Fix:**
- Używaj zawsze `Authorization: Bearer` header
- Lub `X-API-Key` header
- Nigdy w query param!

```typescript
// ✅ Lepiej:
fetch('/api/admin/produkty', {
  headers: { 'X-API-Key': apiKey, ... }
})
```

#### 3. **Brak transaction rollback w lootboxach** (backend)
```java
@PostMapping("/lootbox")
public ResponseEntity<?> addLootboxReward(...) {
    // ❌ Jeśli throw na linii X, partial data zostaje
    reward.setWeight(req.getWeight() > 0 ? ... : 1);
}
```
**Fix:** Dodaj `@Transactional` i custom validation.

---

### 🟡 WAŻNE

#### 4. **Frontend nie sprawdza uprawnienia do sklepu**
```typescript
// shopId z URL — jak gwarantujesz, że user owns it?
const resolvedParams = use(params);
const initialShopId = parseInt(resolvedParams.shopId);
// ❌ Bez JWT verification
```
**Fix:** Backend powinien zwrócić 403 jeśli shop nie należy do użytkownika.  
Frontendzie dodaj safety check:
```typescript
const selectShop = (shop: Shop) => {
  if (shop.id !== initialShopId) {
    toast("Access denied!", "error");
    router.push('/admin');
    return;
  }
  // ... continue
};
```

#### 5. **Brak cache invalidation**
```typescript
// Po dodaniu produktu — fetchProducts() od razu ponownie?
await handleAddProduct();  // POST
await fetchProducts(key, token!);  // GET x 5x jednocześnie?
```
**Problem:** Race conditions, stare UI state  
**Fix:** Optimistic update pattern:
```typescript
const newProduct = { id: tmp, ...formData };
setShopProducts(p => [...p, newProduct]);
try {
  await POST /api/admin/produkt;
  await fetchProducts(); // Re-sync w background
} catch {
  // Revert if failed
}
```

#### 6. **2FA flow nie skończony** (frontend)
```typescript
if (data.requires2fa) {
  toast("Wymagana weryfikacja 2FA – sprawdź email.", "info");
  return; // 💀 To nie robi nic! No transition
}
```
**Status:** 2FA = stub, nie implementacja  
**To zrobić:** Przygotować flow:
- Save tempToken
- Show code input
- Verify `/api/auth/login/verify-2fa`

---

### 🟢 MINOR IMPROVEMENTS

#### 7. **Nieużywane zmienne**
- `isNewUser` — defined ale nigdy nie użyte w UI
- `setupStep` — stan ale bez UI
- `onboardingConfirmed` — jest logika ale incomplete

#### 8. **Typy DTOs**
Backend brakuje dedicated DTOs:
```java
// ❌ Map<String, String> wszędzie
@PatchMapping("/shops/{id}/settings")
public ResponseEntity<?> updateShopSettings(@RequestBody Map<String, String> updates)

// ✅ Powinno być:
@Data
public class ShopSettingsDTO {
  private String dailyRewardName;
  private String discordLink;
  // ...
}
```

#### 9. **Error messages**
- Backend wysyła raw text — brakuje standaryzacji
- Frontend nie parse structure — `const text = await res.text()`

**Fix:** Standardowy format:
```json
{ 
  "error": "LIMIT_EXCEEDED",
  "message": "Limit 1 sklepu dla FREE",
  "retryAfter": 3600
}
```

#### 10. **Brak rate limiting na admin endpoints**
- `/sklep` create — czy jest limit?
- `/produkt` add — spam risk?

---

## 💡 Moje sugestie (personal takes)

### 1. **Split Admin Hub & Shop Panel**
Rozważyć osobne layouty:
```
/admin/ — minimalist hub (list serwerów + profil)
/admin/shop/[id]/ — full-featured panel (dashboard itd)

Wtedy hub może być cached, shop ma SSR/ISR na potrzeby SEO.
```

### 2. **Refactor Frontend State Management**
Teraz wszystko w jednym `ShopPanel` = 50+ useState hooks.  
Rozważyć:
- **Context API** dla auth + shops list
- **useReducer** dla Shop state
- **React Query** dla fetching + caching

Przykład:
```typescript
const { data: shopData, refetch } = useQuery(
  ['shop', shopId], 
  () => fetchShopData(shopId)
);
```

### 3. **Backend: Repository Queries**
Zdefiniuj w repo zamiast w controller:
```java
// ShopRepository.java
@Query("SELECT COALESCE(SUM(p.price), 0) FROM PendingItem i " +
       "JOIN Product p ON i.itemName = p.name " +
       "WHERE i.shop = ?1 AND i.claimed = true")
Double getTotalRevenue(Shop shop);

// Wtedy w controller: 
double revenue = shopRepository.getTotalRevenue(shop);
```

### 4. **Security: API Key Rotation**
Dodać endpoint do regeneracji API key:
```java
@PostMapping("/sklep/{id}/rotate-api-key")
public ResponseEntity<?> rotateApiKey(@PathVariable Long id) {
  // Invalidate old, generate new
}
```

### 5. **UX: Breadcrumbs**
Dodać nawigację w `/admin/shop/[id]`:
```typescript
<div className="text-gray-500 text-sm mb-4">
  <Link href="/admin">Admin</Link> / Serwery / <strong>{activeShopName}</strong>
</div>
```

---

## 📝 TODO List (Priority)

- [ ] **URGENT:** Fix pagination bug (Integer.MAX_VALUE)
- [ ] **URGENT:** Move API key dari URL query → header
- [ ] Validate shop access (403 if not owner)
- [ ] Add optimistic updates pattern
- [ ] Implement 2FA flow completeness
- [ ] Add @Transactional do lootbox endpoints
- [ ] Create proper DTO classes
- [ ] Standardize error responses
- [ ] Add rate limiting
- [ ] Consider useReducer for state management

---

## 🎯 Verdict

**Backend:** Solidne fundamenty, ale performance issues na dużych zbiorach danych.  
**Frontend:** UX jest spoko, ale state management robi się chaotyczne (60+ hooks w jednym componencie).

**Overall:** 7/10 — Działa, ale scale-ability issues. Prioritize pagination fix! 🚀
