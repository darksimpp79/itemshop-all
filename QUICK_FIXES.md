# 🔧 Quick Fixes - Code Snippets

## 1️⃣ FIX: Integer.MAX_VALUE Pagination Bug

**File:** `AdminController.java`  
**Lines:** Stats methods (getDashboardStats, getChartData)

### Problem
```java
// ❌ Current
Page<PendingItem> allPage = itemRepository.findByShop(shop, 
  PageRequest.of(0, Integer.MAX_VALUE)); // Loads 2.1 BILLION rows attempt 💥
```

### Solution
```java
// ✅ Create new repository query first
// PendingItemRepository.java
@Query("SELECT COUNT(i) FROM PendingItem i WHERE i.shop = ?1 AND i.claimed = true")
long countClaimedByShop(Shop shop);

@Query("SELECT COALESCE(SUM(CASE WHEN i.claimed = true " +
       "THEN COALESCE((SELECT p.price FROM Product p WHERE p.name = i.itemName), 0) " +
       "ELSE 0 END), 0) FROM PendingItem i WHERE i.shop = ?1")
Double getTotalRevenue(Shop shop);

// Then in controller getDashboardStats():
long claimedOrders = pendingItemRepository.countClaimedByShop(shop);
double revenue = pendingItemRepository.getTotalRevenue(shop) ?? 0.0;
```

---

## 2️⃣ FIX: API Key in URL → Header

**File:** `ShopPanel` (app/admin/shop/[shopId]/page.tsx)  
**Problem:** `apiKey` visible in logs/history

### Current (❌)
```typescript
fetch(`/api/admin/produkty?apiKey=${apiKey}`, {
  headers: { 'Authorization': `Bearer ${token}`, ... }
})
```

### Fixed (✅)
```typescript
const apiFetch = async (url: string, opts: RequestInit = {}) => {
  const res = await fetch(url, {
    ...opts,
    headers: { 
      "Authorization": `Bearer ${token}`,
      "X-API-Key": apiKey,  // ← Move here
      "Content-Type": "application/json", 
      ...(opts.headers || {}) 
    },
  });
  return res;
};

// Usage everywhere:
await apiFetch('/api/admin/produkty'); // No query params!
await apiFetch('/api/admin/zamowienia?page=0&size=20'); // OK - safe params only
```

**Also update AdminController to accept header:**
```java
// Already done! But ensure all methods have:
@GetMapping("/produkty")
public ResponseEntity<?> getShopProducts(
    @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
    @RequestParam(value = "apiKey", required = false) String apiKeyParam // Keep for backward compat
) {
    String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
    if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
    // ...
}
```

---

## 3️⃣ FIX: Missing @Transactional on Lootbox

**File:** `AdminController.java` ~ Line 600+

### Current (❌)
```java
@PostMapping("/lootbox")
public ResponseEntity<?> addLootboxReward(...) {
    // No @Transactional — if error mid-operation, partial data remains
    reward.setShop(shop);
    reward.setName(req.getName().trim());
    reward.setCommand(req.getCommand().trim());
    reward.setWeight(...);
    return ResponseEntity.ok(lootboxRewardRepository.save(reward));
}
```

### Fixed (✅)
```java
@PostMapping("/lootbox")
@Transactional // ← Add this
public ResponseEntity<?> addLootboxReward(
    @RequestHeader(value = "X-API-Key", required = false) String apiKeyHeader,
    @RequestParam(value = "apiKey", required = false) String apiKeyParam,
    @RequestBody pl.ziutek.itemshop.model.LootboxReward req
) {
    String apiKey = resolveApiKey(apiKeyHeader, apiKeyParam);
    if (apiKey == null) return ResponseEntity.status(401).body("Brak klucza API!");
    
    // Validation FIRST
    if (req.getName() == null || req.getName().isBlank()) {
        return ResponseEntity.badRequest().body("Nazwa nagrody jest wymagana");
    }
    if (req.getCommand() == null || req.getCommand().isBlank()) {
        return ResponseEntity.badRequest().body("Komenda jest wymagana");
    }
    
    return withOwnedShop(apiKey, shop -> {
        pl.ziutek.itemshop.model.LootboxReward reward = new pl.ziutek.itemshop.model.LootboxReward();
        reward.setShop(shop);
        reward.setName(req.getName().trim());
        reward.setCommand(req.getCommand().trim());
        reward.setWeight(req.getWeight() != null && req.getWeight() > 0 ? req.getWeight() : 1);
        
        return ResponseEntity.ok(lootboxRewardRepository.save(reward));
    });
}
```

---

## 4️⃣ FIX: Shop Access Validation (Frontend Safety Check)

**File:** `app/admin/shop/[shopId]/page.tsx`  
**Line:** ~selectShop()

### Current (❌)
```typescript
useEffect(() => {
  if (myShops.length > 0 && initialShopId && !activeShopName) {
    const shop = myShops.find(s => s.id === initialShopId);
    if (shop) selectShop(shop);
    // ❌ What if shop is undefined? No error handling
  }
}, [myShops, initialShopId, activeShopName]);
```

### Fixed (✅)
```typescript
useEffect(() => {
  if (myShops.length > 0 && initialShopId && !activeShopName) {
    const shop = myShops.find(s => s.id === initialShopId);
    if (shop) {
      selectShop(shop);
    } else {
      // User trying to access shop they don't own
      toast("Nie masz dostępu do tego sklepu", "error");
      router.push('/admin');
    }
  }
}, [myShops, initialShopId, activeShopName, toast, router]);
```

---

## 5️⃣ FIX: Incomplete 2FA Flow

**File:** `app/admin/shop/[shopId]/page.tsx`  
**Line:** ~700 (handleLogin function)

### Current (❌)
```typescript
const handleLogin = async () => {
  // ...
  if (data.requires2fa) {
    toast("Wymagana weryfikacja 2FA – sprawdź email.", "info");
    return; // ← Stops here, nothing happens!
  }
```

### Fixed (✅)
```typescript
const handleLogin = async () => {
  if (!email || !password) {
    toast("Podaj email i hasło!", "error");
    return;
  }
  setAuthLoading(true);
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (res.ok) {
      const data = await res.json();
      
      if (data.requires2fa) {
        // ✅ Save temp token and switch to 2FA step
        setPendingTempToken(data.tempToken);
        setPendingEmail(email);
        setAuthStep("login_2fa");
        toast("Kod 2FA wysłany na email", "info");
        return;
      }
      
      // Normal login flow
      const token = data.token;
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_email", email);
      setToken(token);
      loadData(token);
    } else {
      const text = await res.text();
      toast(text || "Błąd logowania!", "error");
    }
  } catch {
    toast("Błąd połączenia!", "error");
  } finally {
    setAuthLoading(false);
  }
};

// Add 2FA verification handler
const handleLogin2fa = async () => {
  if (authCode.length < 6) {
    toast("Kod musi mieć 6 cyfr", "error");
    return;
  }
  
  setAuthLoading(true);
  try {
    const res = await fetch("/api/auth/login/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempToken: pendingTempToken,
        code: authCode,
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_email", pendingEmail);
      setToken(data.token);
      setAuthStep("credentials");
      loadData(data.token);
      toast("Zalogowano!", "success");
    } else {
      toast("Nieprawidłowy kod 2FA", "error");
    }
  } catch {
    toast("Błąd połączenia", "error");
  } finally {
    setAuthLoading(false);
  }
};
```

---

## 6️⃣ FIX: Optimistic Updates Pattern

**File:** `app/admin/shop/[shopId]/page.tsx`  
**Line:** ~handleAddProduct()

### Current (❌)
```typescript
const handleAddProduct = async () => {
  setIsUploading(true);
  try {
    const res = await fetch("/api/admin/produkt", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: prodName,
        description: prodDesc,
        price: parseFloat(prodPrice),
        // ...
      }),
    });
    if (res.ok) {
      toast("Produkt dodany!", "success");
      // Then immediately refetch ALL products
      await fetchProducts(apiKey, token!);
      // UI locked until fetch completes
    }
  }
};
```

### Fixed (✅)
```typescript
const handleAddProduct = async () => {
  if (!prodName || !prodPrice || !prodMode) {
    toast("Wypełnij wszystkie pola", "error");
    return;
  }

  // ✅ Create optimistic product
  const optimisticProduct: Product = {
    id: -Date.now(), // Temp ID
    name: prodName,
    description: prodDesc,
    price: parseFloat(prodPrice),
    mode: prodMode,
    iconEmoji: prodEmoji,
    imageUrl: prodImageUrl,
    commands: prodCmd ? prodCmd.split('\n').filter(c => c.trim()) : [],
  };

  // ✅ Update UI immediately
  setShopProducts(prev => [...prev, optimisticProduct]);
  resetProductForm();

  setIsUploading(true);
  try {
    const res = await fetch("/api/admin/produkt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(optimisticProduct),
    });

    if (res.ok) {
      const savedProduct = await res.json();
      // ✅ Replace temp with real product
      setShopProducts(prev =>
        prev.map(p => p.id === optimisticProduct.id ? savedProduct : p)
      );
      toast("Produkt dodany! ✅", "success");
    } else {
      const error = await res.text();
      // ✅ Revert on error
      setShopProducts(prev => prev.filter(p => p.id !== optimisticProduct.id));
      toast(error || "Błąd dodawania produktu!", "error");
    }
  } catch (err) {
    // ✅ Revert on network error
    setShopProducts(prev => prev.filter(p => p.id !== optimisticProduct.id));
    toast("Błąd połączenia!", "error");
  } finally {
    setIsUploading(false);
  }
};

const resetProductForm = () => {
  setProdId(null);
  setProdName("");
  setProdDesc("");
  setProdEmoji("📦");
  setProdImageUrl("");
  setProdPrice("");
  setProdMode("");
  setProdCmd("");
};
```

---

## 📊 Implementation Priority

| # | Issue | Severity | Time | Files |
|---|-------|----------|------|-------|
| 1 | Integer.MAX_VALUE pagination | 🔴 CRITICAL | 30m | AdminController.java |
| 2 | API Key in URL | 🔴 CRITICAL | 15m | ShopPanel.tsx |
| 3 | 2FA incomplete flow | 🟡 HIGH | 45m | ShopPanel.tsx |
| 4 | Missing @Transactional | 🟡 HIGH | 10m | AdminController.java |
| 5 | Shop access check | 🟡 HIGH | 20m | ShopPanel.tsx |
| 6 | Optimistic updates | 🟢 MEDIUM | 60m | ShopPanel.tsx |

---

**Total Estimated Time:** ~2.5 hours for all fixes
