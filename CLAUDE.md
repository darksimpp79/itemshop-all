# ItemShop SaaS — Project Context for Claude Code

## Struktura projektu
```
itemshop-all/
├── itemshop-backend/     # Spring Boot (Java 21, Gradle)
├── itemshop-front/       # Next.js 15 (App Router, Tailwind, TypeScript)
└── itemshop-plugin/      # PaperMC plugin (Minecraft)
```

## Stack

### Backend (Spring Boot)
- Java 21, Gradle, Spring Security (JWT stateless)
- JWT auth z JTI blacklistą (`BlacklistedToken` tabela)
- Stripe webhooks (idempotentne przez `ProcessedStripeEvent`)
- Caffeine cache na endpointach storefrontu
- Resend API do emaili (kody 2FA, weryfikacja)
- BCrypt hasła, SHA-256 kody auth
- Baza: JPA/Hibernate (domyślnie H2 dev, docelowo PostgreSQL)

### Frontend (Next.js)
- App Router, Tailwind CSS, TypeScript
- Token JWT w `localStorage` pod kluczem `auth_token`
- API calls przez relative `/api/*` (Next.js rewrites → backend :8080)
- Brak zewnętrznych UI bibliotek (shadcn nie zainstalowane)

### Plugin (PaperMC)
- Komunikuje się z backendem przez REST
- Nagłówek `X-API-Key` do autentykacji
- Endpoint: `GET /api/storefront/{serverName}/magazyn/{playerName}`
- Endpoint: `POST /api/storefront/{serverName}/magazyn/odbierz/{itemId}`

## Kluczowe endpointy backendu

### Auth (`/api/auth/*`) — publiczne
- `POST /register` → rejestracja (DEV: bez emaila, PROD: wysyła kod)
- `POST /register/verify` → `{email, code}` → JWT string
- `POST /login` → `{email, password}` → `{token}` lub `{requires2fa, tempToken}`
- `POST /login/verify-2fa` → `{tempToken, code}` → `{token}`
- `POST /logout` → blacklistuje JTI tokenu (wymaga Bearer)
- `POST /2fa/enable/request` → wysyła kod (wymaga Bearer)
- `POST /2fa/enable/confirm` → `{code}` (wymaga Bearer)
- `POST /2fa/disable` → (wymaga Bearer)
- `GET /2fa/status` → `{twoFactorEnabled, emailVerified}` (wymaga Bearer)

### Admin (`/api/admin/*`) — wymaga Bearer + X-API-Key
- `GET /user/profile` → `{email, subscriptionPlan, emailVerified, twoFactorEnabled, firstName, lastName, phoneNumber}`
- `PATCH /user/profile` → `{firstName, lastName, phoneNumber}`
- `GET /moje-sklepy` → `[{id, serverName, serverIp, customDomain, apiKey, theme, dailyRewardName, dailyRewardCommand, discordLink, bannerText}]`
- `POST /sklep?serverName=X` → tworzy sklep
- `PUT /sklep/ip?serverIp=X` → X-API-Key required
- `PUT /sklep/motyw?theme=X` → X-API-Key required
- `PATCH /shops/{id}/settings` → `{dailyRewardName, dailyRewardCommand, discordLink, bannerText}`
- `POST /custom-domain?customDomain=X` → weryfikacja DNS (PRO only)
- `POST /produkt` → `{id?, name, description, iconEmoji, imageUrl, price, requiredSlots, mode, commands[]}`
- `GET /produkty` → lista produktów (X-API-Key)
- `PUT /produkty/kolejnosc` → `[{id, position}]`
- `DELETE /produkt/{id}`
- `GET /zamowienia` → PageableResponse
- `GET /zamowienia/export` → CSV z BOM
- `GET /stats` → `{totalOrders, claimedOrders, totalRevenue, uniquePlayers}`
- `GET /stats/chart` → `[{date, revenue, orders}]` (ostatnie 7 dni)
- `GET /tryby` → lista trybów (X-API-Key)
- `POST /tryb` → `{id?, name, description, imageUrl}` (FREE: max 1)
- `DELETE /tryb/{id}`
- `GET /lootbox` → lista nagród
- `POST /lootbox` → `{name, command, weight}`
- `DELETE /lootbox/{id}`

### Storefront (`/api/storefront/*`) — publiczne
- `GET /{serverName}/info` → info o sklepie
- `GET /{serverName}/produkty` → lista produktów
- `GET /{serverName}/tryby` → lista trybów
- `POST /{serverName}/checkout?productId=X&nick=Y&mode=Z` → Stripe URL
- `POST /{serverName}/daily/{nick}?mode=Z` → daily reward (cooldown 24h)
- `GET /{serverName}/wallet/{nick}` → `{nickname, points}`
- `POST /{serverName}/lootbox/{nick}?mode=Z` → otwiera lootbox (koszt 500 pkt)

### Payment (`/api/payment/*`)
- `POST /create-checkout-session` → `{url}` — PRO upgrade 29.99 PLN (wymaga Bearer)
- `POST /webhook` — Stripe webhook (publiczny, weryfikacja podpisem)

### Files (`/api/files/*`)
- `POST /upload` → multipart, zwraca `{url}` (wymaga Bearer)
- `GET /images/**` — statyczne obrazki z `uploads/products/`

## Modele danych (JPA)

### Owner
```
id, email (unique), password (BCrypt, @JsonIgnore),
subscriptionPlan (FREE/PRO), role (USER),
emailVerified, twoFactorEnabled,
firstName, lastName, phoneNumber
shops → List<Shop> (OneToMany, @JsonIgnore)
```

### Shop
```
id, serverName, serverIp, theme (default),
customDomain (unique), apiKey (unique, sk_+UUID),
dailyRewardCommand, dailyRewardName,
discordLink, bannerText, termsContent
owner → Owner (ManyToOne, @JsonIgnore)
```

### Product
```
id, shop (ManyToOne, @JsonIgnore), name, description,
iconEmoji, imageUrl, price (Double), requiredSlots,
mode (lowercase trimmed), position,
commands → List<String> (ElementCollection → product_commands)
```

### PendingItem (magazyn MC)
```
id, shop (ManyToOne, @JsonIgnore), playerName,
itemName, rewardCommand, mode, requiredSlots,
claimed (default false), createdAt
Indeks: (shop_id, player_name, mode, claimed)
```

### Order
```
id, nickname, status (PENDING/PAID/COLLECTED),
createdAt, product (ManyToOne LAZY), shop (ManyToOne LAZY, @JsonIgnore)
```

### PlayerWallet
```
id, nickname (unique), points (default 0)
Globalny — niezwiązany ze sklepem
Punkty: 10 pkt za każdy 1 PLN zakupu
```

## Bezpieczeństwo — WAŻNE

- Token JWT: 24h, zawiera `{email, role, jti, pre2fa}`
- Pre-2FA token: 10min, `pre2fa=true` — tylko do `/login/verify-2fa`
- JwtFilter odrzuca pre2fa tokeny na chronionych endpointach
- Blacklista JTI w tabeli `blacklisted_tokens` (czyszczona co 1h)
- Rate limiter: sliding window, in-memory (nie Redis — single instance)
- CORS: `setAllowedOriginPatterns("*")` w devie, zmień na produkcji
- X-API-Key: per-shop, `sk_` + UUID, generowany przy tworzeniu sklepu

## Plany subskrypcji
- **FREE**: max 1 sklep, max 1 tryb gry, tylko motyw "default"
- **PRO**: nielimitowane sklepy/tryby, wszystkie motywy, własna domena
- Upgrade: Stripe Checkout 29.99 PLN, webhook `subscription_pro` → `owner.subscriptionPlan = "PRO"`

## Frontend — konwencje

### Auth flow
```
localStorage["auth_token"] = JWT string
localStorage["auth_email"] = email string
```

### Fetch pattern (admin)
```typescript
fetch("/api/admin/endpoint", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-API-Key": apiKey,        // wymagane dla endpointów sklepu
    "Content-Type": "application/json"
  }
})
```

### Race condition — KRYTYCZNE
Token ze `useState` może być `null` w pierwszym `useEffect`.
**Zawsze** czytaj z `localStorage.getItem("auth_token")` w `useEffect`
i przekazuj jako argument do funkcji fetch — NIE polegaj na state.

```typescript
// ✅ DOBRZE
useEffect(() => {
  const t = localStorage.getItem("auth_token");
  if (!t) { router.push("/admin"); return; }
  setToken(t);
  loadData(t); // przekaż t, nie token ze state
}, []);

// ❌ ŹLE
useEffect(() => {
  if (!token) return; // token jest null przy pierwszym renderze!
  loadData(token);
}, [token]);
```

### Ścieżki stron
- `/admin` — hub (lista sklepów, profil, logowanie)
- `/admin/shop/[shopId]` — panel konkretnego sklepu
- `/` lub subdomena — storefront (DefaultTheme/RetroTheme/RpgTheme)

## Komendy

```bash
# Backend
cd itemshop-backend
./gradlew bootRun               # dev server :8080
./gradlew test                  # testy
./gradlew build                 # build + testy

# Frontend
cd itemshop-front
npm run dev                     # dev server :3000
npm run build                   # production build
npm run lint                    # ESLint

# Plugin
cd itemshop-plugin
./gradlew shadowJar             # buduje plugin .jar
```

## Next.js rewrites (wymagane dla dev)
W `next.config.js` musi być:
```javascript
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: "http://localhost:8080/api/:path*",
    },
  ];
}
```
Bez tego wszystkie `/api/*` requesty zwracają 404/403 z Next.js.

## Znane gotcha / pułapki

1. **DEV BYPASS w AuthController**: rejestracja zapisuje konto bez weryfikacji emaila na środowisku dev — to celowe
2. **X-API-Key jest obowiązkowy** dla endpointów `/api/admin/produkty`, `/tryby`, `/zamowienia`, `/stats`, `/lootbox` — bez niego 403
3. **`fetchOrders` zwraca PageableResponse** → `d.content || d` (obsłuż oba formaty)
4. **Stripe webhook** musi być na publicznym URL — użyj `stripe listen --forward-to localhost:8080/api/payment/webhook` w devie
5. **Cache Caffeine** na storefroncie — TTL 10-30s. Zmiany w adminie widoczne z opóźnieniem na storefront
6. **Motywy**: "default" (free), "dark"/"forest"/"ocean" (PRO only)
7. **Daily reward** — unique constraint `(player_name, server_name, mode)` w DB blokuje race condition
8. **Punkty portfela** — globalne per nick (nie per sklep). 10 pkt = 1 PLN zakupu