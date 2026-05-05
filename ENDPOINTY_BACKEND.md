# 📌 ItemShop Backend — Dokumentacja Endpointów

**Serwer:** `http://localhost:8080` (dev) | `https://api.itemshop.pl` (prod)  
**Autentykacja:** `Bearer {JWT_TOKEN}` lub `X-API-Key: {API_KEY}`

---

## 🎮 1. ENDPOINTY DLA PLUGINU MINECRAFT

### 1.1 Pobierz przedmioty gracza (`magazyn`)

**Endpoint:** `GET /api/storefront/{serverName}/magazyn/{playerName}`

Pobiera listę przedmiotów czekających na gracza w danym trybie gry.

**Parametry:**
- `serverName` (path) — nazwa serwera, np. `survival`
- `playerName` (path) — nick gracza, np. `gracz123`
- `mode` (query) — tryb gry, np. `survival`, `pvp`
- `X-API-Key` (header) — **wymagany**, klucz API sklepu

**Request:**
```bash
GET http://localhost:8080/api/storefront/survival/magazyn/gracz123?mode=survival
Headers: X-API-Key: sk_1234567890abcdef
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "playerName": "gracz123",
    "itemName": "Diament x5",
    "rewardCommand": "give gracz123 diamond 5",
    "mode": "survival",
    "claimed": false,
    "createdAt": "2025-05-05T14:30:00"
  },
  {
    "id": 2,
    "playerName": "gracz123",
    "itemName": "Szmaragd x10",
    "rewardCommand": "give gracz123 emerald 10",
    "mode": "survival",
    "claimed": false,
    "createdAt": "2025-05-05T15:00:00"
  }
]
```

**Błędy:**
- `401 Unauthorized` — Błędny/brakujący klucz API
- `404 Not Found` — Serwer nie istnieje

---

### 1.2 Oznacz przedmiot jako odebrany

**Endpoint:** `POST /api/storefront/{serverName}/magazyn/odbierz/{itemId}`

Zmienia status przedmiotu na `claimed: true` — przedmiot jest już odebrany na serwerze.

**Parametry:**
- `serverName` (path) — nazwa serwera
- `itemId` (path) — ID przedmiotu
- `X-API-Key` (header) — **wymagany**, klucz API sklepu

**Request:**
```bash
POST http://localhost:8080/api/storefront/survival/magazyn/odbierz/1
Headers: X-API-Key: sk_1234567890abcdef
```

**Response (200 OK):**
```json
{
  "message": "Zaktualizowano status."
}
```

**Błędy:**
- `400 Bad Request` — Błąd zmiany statusu, przedmiot już odebrany
- `401 Unauthorized` — Błędny klucz API
- `404 Not Found` — Przedmiot lub serwer nie istnieje

---

### 1.3 IMPLEMENTACJA PLUGINU (Pseudokod)

```java
// 1. Pobranie przedmiotów z bazy
List<PendingItem> items = httpGet(
    "/api/storefront/survival/magazyn/gracz123?mode=survival",
    headers: {"X-API-Key": "sk_xxxxx"}
);

// 2. Wykonanie komend dla każdego przedmiotu
for (item : items) {
    if (!item.isClaimed()) {
        executeCommand(item.getRewardCommand());  // give gracz123 diamond 5
        
        // 3. Oznaczenie jako odebrane
        httpPost(
            "/api/storefront/survival/magazyn/odbierz/" + item.getId(),
            headers: {"X-API-Key": "sk_xxxxx"}
        );
    }
}
```

---

## 🏪 2. ENDPOINTY DLA SKLEPU (Publiczne)

Te endpointy są dostępne dla każdego — nie wymagają autentykacji.

### 2.1 Informacje o sklepie

**Endpoint:** `GET /api/storefront/{serverName}/info`

**Response:**
```json
{
  "serverName": "survival",
  "serverIp": "play.example.com",
  "theme": "default",
  "discordLink": "https://discord.gg/xyz",
  "bannerText": "Witaj w naszym sklepie!",
  "termsContent": "Regulamin..."
}
```

---

### 2.2 Lista produktów

**Endpoint:** `GET /api/storefront/{serverName}/produkty`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Pakiet Diamentów",
    "description": "5 diamentów",
    "iconEmoji": "💎",
    "imageUrl": "https://api.itemshop.pl/images/diamond.png",
    "price": 9.99,
    "requiredSlots": 1,
    "mode": "survival",
    "position": 1,
    "commands": ["give {player} diamond 5"]
  },
  {
    "id": 2,
    "name": "Zestaw VIP",
    "description": "Loot VIP",
    "iconEmoji": "👑",
    "imageUrl": "https://api.itemshop.pl/images/vip.png",
    "price": 29.99,
    "requiredSlots": 5,
    "mode": "survival",
    "position": 2,
    "commands": ["give {player} diamond 10", "give {player} netherite_ingot 1"]
  }
]
```

---

### 2.3 Lista trybów gry

**Endpoint:** `GET /api/storefront/{serverName}/tryby`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Survival",
    "description": "Główny serwer",
    "imageUrl": "https://..."
  },
  {
    "id": 2,
    "name": "PvP",
    "description": "Tryb PvP",
    "imageUrl": "https://..."
  }
]
```

---

### 2.4 Checkout (Stripe)

**Endpoint:** `POST /api/storefront/{serverName}/checkout`

Tworzy sesję Stripe do płatności za produkt.

**Parametry (query):**
- `productId` — ID produktu
- `nick` — nick gracza (3-16 znaków: litery, cyfry, `_`)
- `mode` (opcjonalnie) — tryb gry
- `promoCode` (opcjonalnie) — kod promocyjny

**Request:**
```bash
POST /api/storefront/survival/checkout?productId=1&nick=gracz123&mode=survival
```

**Response (200 OK):**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_xyz"
}
```

Po tym user jest przekierowywany do Stripe i płaci. Webhook automatycznie tworzy `PendingItem`.

---

### 2.5 Nagroda dzienna

**Endpoint:** `POST /api/storefront/{serverName}/nagroda`

**Parametry:**
- `nick` — nick gracza
- `mode` (opcjonalnie) — tryb gry

**Response (200 OK):**
```json
{
  "message": "Nagroda przyznana!"
}
```

**Errory:**
- `429 Too Many Requests` — Już odebrałeś bonus dzisiaj. Spróbuj za: `HH:MM:SS`

---

### 2.6 Portfel gracza (punkty)

**Endpoint:** `GET /api/storefront/{serverName}/wallet/{nick}`

**Response:**
```json
{
  "points": 50
}
```

Punkty są **globalne** (nie per sklep). Za każdy 1 PLN zakupu gracz dostaje 10 punktów.

---

### 2.7 Otwarcie lootbox'a

**Endpoint:** `POST /api/storefront/{serverName}/lootbox/{nick}`

**Parametry:**
- `mode` (query, opcjonalnie) — tryb gry

Kosztuje **500 punktów**. Losuje nagrodę ze skonfigurowanych nagród w adminie.

**Response (200 OK):**
```json
{
  "success": true,
  "reward": "5x Diament",
  "message": "Wylosowano: 5x Diament! Przedmiot czeka w /magazyn"
}
```

**Błędy:**
- `400 Bad Request` — Zbyt mało punktów!

---

### 2.8 Walidacja kodu promo

**Endpoint:** `GET /api/storefront/{serverName}/promo/{code}`

Sprawdzenie czy kod promocyjny jest ważny.

**Response (200 OK):**
```json
{
  "valid": true,
  "discountPercent": 10,
  "code": "SPRING2025"
}
```

---

### 2.9 Top donatorzy

**Endpoint:** `GET /api/storefront/{serverName}/top-donatorzy`

**Response:**
```json
[
  { "nick": "gracz1", "amount": 129.90 },
  { "nick": "gracz2", "amount": 99.99 },
  { "nick": "gracz3", "amount": 49.99 }
]
```

---

### 2.10 Ostatnie zakupy

**Endpoint:** `GET /api/storefront/{serverName}/ostatnie-zakupy`

**Response:**
```json
[
  { "nick": "gracz1", "item": "Diament x5", "time": "5 minut temu" },
  { "nick": "gracz2", "item": "Zestaw VIP", "time": "30 minut temu" }
]
```

---

## 👨‍💼 3. ENDPOINTY ADMIN

**Wymagana autentykacja:**
- `Authorization: Bearer {JWT_TOKEN}` — token z logowania
- `X-API-Key: {API_KEY}` — klucz sklepu (dla endpointów zarządzania sklepem)

---

### 3.1 AUTORYZACJA

#### Rejestracja

**Endpoint:** `POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "haslo123456"
}
```

**Response:**
```json
{
  "message": "Kod weryfikacyjny wysłany na adres user@example.com..."
}
```

---

#### Weryfikacja rejestracji

**Endpoint:** `POST /api/auth/register/verify`

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```
Konto zostało potwierdzone i utworzone. Możesz się zalogować.
```

---

#### Logowanie

**Endpoint:** `POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "haslo123456"
}
```

**Response (bez 2FA):**
```json
{
  "requires2fa": false,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (z 2FA):**
```json
{
  "requires2fa": true,
  "twoFactorMethod": "EMAIL",
  "tempToken": "eyJhbGc...",
  "message": "Kod 2FA został wysłany na email."
}
```

---

#### Weryfikacja 2FA

**Endpoint:** `POST /api/auth/login/verify-2fa`

```json
{
  "tempToken": "eyJhbGc...",
  "code": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3.2 PROFIL UŻYTKOWNIKA

#### Pobierz profil

**Endpoint:** `GET /api/admin/user/profile`

**Headers:** `Authorization: Bearer {TOKEN}`

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "subscriptionPlan": "FREE",
  "emailVerified": true,
  "twoFactorEnabled": false,
  "firstName": "Jan",
  "lastName": "Kowalski",
  "phoneNumber": "+48123456789"
}
```

---

#### Zaktualizuj profil

**Endpoint:** `PATCH /api/admin/user/profile`

```json
{
  "firstName": "Jan",
  "lastName": "Kowalski",
  "phoneNumber": "+48123456789"
}
```

---

### 3.3 ZARZĄDZANIE SKLEPAMI

#### Utwórz sklep

**Endpoint:** `POST /api/admin/sklep?serverName=survival`

**Response:**
```json
{
  "id": 1,
  "serverName": "survival",
  "serverIp": null,
  "theme": "default",
  "customDomain": null,
  "apiKey": "sk_a1b2c3d4e5f6g7h8i9j0",
  "dailyRewardCommand": "give {player} emerald 1",
  "dailyRewardName": "Darmowy Bonus 24h"
}
```

---

#### Lista moich sklepów

**Endpoint:** `GET /api/admin/moje-sklepy`

**Response:**
```json
[
  {
    "id": 1,
    "serverName": "survival",
    "serverIp": "play.example.com",
    "theme": "default",
    "customDomain": "sklep.example.com",
    "apiKey": "sk_xxxxx",
    "dailyRewardName": "Bonus 24h",
    "dailyRewardCommand": "give {player} emerald 1",
    "discordLink": "https://discord.gg/xyz",
    "bannerText": "Witaj!"
  }
]
```

---

#### Zaktualizuj IP serwera

**Endpoint:** `PUT /api/admin/sklep/ip?serverIp=192.168.1.1`

**Headers:** `X-API-Key: sk_xxxxx`

---

#### Zaktualizuj motyw

**Endpoint:** `PUT /api/admin/sklep/motyw?theme=dark`

**Headers:** `X-API-Key: sk_xxxxx`

**Dostępne motywy:**
- `default` — FREE
- `dark`, `forest`, `ocean` — STARTER+
- wszystkie — PRO

---

#### Ustawienia sklepu

**Endpoint:** `PATCH /api/admin/shops/{id}/settings`

```json
{
  "dailyRewardName": "Bonus 24h",
  "dailyRewardCommand": "give {player} diamond 1",
  "discordLink": "https://discord.gg/xyz",
  "bannerText": "Nowy sezon!",
  "termsContent": "Regulamin sklepu..."
}
```

---

#### Niestandardowa domena

**Endpoint:** `POST /api/admin/custom-domain?customDomain=sklep.example.com`

**Headers:** `X-API-Key: sk_xxxxx`

**Wymagania:**
- Plan: PRO
- Weryfikacja DNS (CNAME record)

---

### 3.4 PRODUKTY

#### Dodaj produkt

**Endpoint:** `POST /api/admin/produkt`

**Headers:** `X-API-Key: sk_xxxxx`

```json
{
  "name": "Diament x5",
  "description": "5 diamentów do gry",
  "iconEmoji": "💎",
  "imageUrl": "https://...",
  "price": 9.99,
  "requiredSlots": 1,
  "mode": "survival",
  "position": 1,
  "commands": ["give {player} diamond 5"]
}
```

**Limity:**
- FREE: 5 produktów
- STARTER: 30 produktów
- PRO: Brak limitu

---

#### Lista produktów

**Endpoint:** `GET /api/admin/produkty`

**Headers:** `X-API-Key: sk_xxxxx`

---

#### Zmień kolejność produktów

**Endpoint:** `PUT /api/admin/produkty/kolejnosc`

**Headers:** `X-API-Key: sk_xxxxx`

```json
[
  { "id": 1, "position": 1 },
  { "id": 2, "position": 2 },
  { "id": 3, "position": 3 }
]
```

---

#### Usuń produkt

**Endpoint:** `DELETE /api/admin/produkt/{id}`

---

### 3.5 ZAMÓWIENIA

#### Lista zamówień (paginacja)

**Endpoint:** `GET /api/admin/zamowienia?page=0&size=20`

**Headers:** `X-API-Key: sk_xxxxx`

**Response:**
```json
{
  "content": [
    {
      "id": 1,
      "playerName": "gracz123",
      "itemName": "Diament x5",
      "rewardCommand": "give gracz123 diamond 5",
      "mode": "survival",
      "claimed": true,
      "createdAt": "2025-05-05T14:30:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 150,
  "totalPages": 8
}
```

---

#### Eksport zamówień (CSV)

**Endpoint:** `GET /api/admin/zamowienia/export`

**Headers:** `X-API-Key: sk_xxxxx`

Zwraca plik CSV z BOM (UTF-8) wszystkich zamówień.

---

### 3.6 STATYSTYKI

#### Statystyki dashboardu

**Endpoint:** `GET /api/admin/stats`

**Headers:** `X-API-Key: sk_xxxxx`

**Response:**
```json
{
  "totalOrders": 150,
  "claimedOrders": 145,
  "totalRevenue": 1499.50,
  "uniquePlayers": 85
}
```

---

#### Wykres (ostatnie 7 dni)

**Endpoint:** `GET /api/admin/stats/chart`

**Headers:** `X-API-Key: sk_xxxxx`

**Response:**
```json
[
  { "date": "Pon", "revenue": 150.0, "orders": 15 },
  { "date": "Wt", "revenue": 200.0, "orders": 20 },
  ...
]
```

---

### 3.7 TRYBY GRY

#### Lista trybów

**Endpoint:** `GET /api/admin/tryby`

**Headers:** `X-API-Key: sk_xxxxx`

---

#### Dodaj tryb

**Endpoint:** `POST /api/admin/tryb`

**Headers:** `X-API-Key: sk_xxxxx`

```json
{
  "name": "Survival",
  "description": "Główny serwer",
  "imageUrl": "https://..."
}
```

**Limity:**
- FREE: 1 tryb
- STARTER: 3 tryby
- PRO: Brak limitu

---

#### Usuń tryb

**Endpoint:** `DELETE /api/admin/tryb/{id}`

---

### 3.8 LOOTBOXY

#### Lista nagród

**Endpoint:** `GET /api/admin/lootbox`

**Headers:** `X-API-Key: sk_xxxxx`

**Response:**
```json
[
  {
    "id": 1,
    "name": "5x Diament",
    "command": "give {player} diamond 5",
    "weight": 5
  }
]
```

---

#### Dodaj nagrodę

**Endpoint:** `POST /api/admin/lootbox`

**Headers:** `X-API-Key: sk_xxxxx`

```json
{
  "name": "5x Diament",
  "command": "give {player} diamond 5",
  "weight": 5
}
```

**Uwaga:** Weight — szansa na wylosowanie (wyższa = większa szansa).

---

#### Usuń nagrodę

**Endpoint:** `DELETE /api/admin/lootbox/{id}`

---

### 3.9 KODY PROMOCYJNE

#### Lista kodów

**Endpoint:** `GET /api/admin/kody-promo`

**Headers:** `X-API-Key: sk_xxxxx`

---

#### Dodaj kod

**Endpoint:** `POST /api/admin/kod-promo`

**Headers:** `X-API-Key: sk_xxxxx`

```json
{
  "code": "SPRING2025",
  "discountPercent": 10,
  "active": true,
  "expiresAt": "2025-06-05T23:59:59",
  "maxUses": 100
}
```

---

### 3.10 SUBSKRYPCJA

#### Utwórz sesję checkout (PRO)

**Endpoint:** `POST /api/payment/create-checkout-session`

**Headers:** `Authorization: Bearer {TOKEN}`

**Response:**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_xyz"
}
```

Cena: 29.99 PLN/miesiąc

---

#### Utwórz sesję checkout (STARTER)

**Endpoint:** `POST /api/payment/create-checkout-session-starter`

**Cena:** 9.99 PLN/miesiąc

---

#### Anuluj subskrypcję

**Endpoint:** `POST /api/payment/cancel-subscription`

Anuluje na koniec bieżącego okresu.

---

## 🔐 BEZPIECZEŃSTWO

### API Key (`X-API-Key`)

- Format: `sk_` + UUID
- Generowany automatycznie przy tworzeniu sklepu
- **Timing-safe** porównanie (ochrona przed timing attack)
- Wysyłany zawsze w headerze

### JWT Token

- TTL: 24 godziny
- Zawiera: `email`, `role`, `jti`, `pre2fa`
- Pre-2FA token: 10 minut (tylko do `/login/verify-2fa`)
- Blacklista JTI w DB (wylogowanie)

### Rate Limiting

- Rejestracja: 5 prób/60s
- Logowanie: 10 prób/60s
- Sliding window (in-memory)

### Walidacja

- Email: podstawowa format-check
- Nick gracza: `^[a-zA-Z0-9_]{3,16}$` (zapobiega command injection)
- Hasło: min 8 znaków
- Domena: format regex + DNS verification

---

## 📊 MODELE DANYCH

### PendingItem (Przedmiot w magazynie)

```
id              — Long
playerName      — String
itemName        — String
rewardCommand   — String
mode            — String (lowercase)
claimed         — Boolean (false = czeka, true = odebrany)
createdAt       — LocalDateTime
shop_id         — FK → Shop
```

### Shop (Sklep)

```
id                    — Long
serverName            — String (unique)
serverIp              — String
theme                 — String
customDomain          — String (unique, nullable)
apiKey                — String (unique, sk_UUID)
dailyRewardCommand    — String
dailyRewardName       — String
discordLink           — String
bannerText            — String
termsContent          — String (Long)
owner_id              — FK → Owner
```

### Product (Produkt)

```
id                — Long
name              — String
description       — String
iconEmoji         — String
imageUrl          — String
price             — Double
requiredSlots     — Integer
mode              — String
position          — Integer
commands          — List<String>
shop_id           — FK → Shop
```

### Owner (Właściciel)

```
id                      — Long
email                   — String (unique)
password                — String (BCrypt, @JsonIgnore)
role                    — String (USER)
subscriptionPlan        — String (FREE/STARTER/PRO)
subscriptionExpiresAt   — LocalDateTime
emailVerified           — Boolean
twoFactorEnabled        — Boolean
twoFactorMethod         — String (EMAIL/TOTP)
firstName               — String
lastName                — String
phoneNumber             — String
stripeCustomerId        — String
stripeSubscriptionId    — String
```

---

## 🚀 CACHE (Caffeine)

Endpointy storefront'u mają cache **TTL 10-30s**:
- Info sklepu
- Produkty
- Tryby
- Top donatorzy
- Ostatnie zakupy

**Ważne:** Zmiany w adminie widoczne z opóźnieniem na storefront!

---

## ⚡ Znane optymalizacje

✅ Paginacja zamówień — nie ładujemy wszystkich do RAM  
✅ Indeks na `(shop_id, player_name, mode, claimed)` — szybkie query  
✅ Timing-safe porównanie API key — ochrona  
✅ `@Transactional` na operacjach — atomowość  
✅ SELECT FOR UPDATE na portfelach — race condition  
✅ Walidacja nicku regex — zapobiega command injection  

---

## 📞 Kontakt / Problemy

- Webhook Stripe: `stripe listen --forward-to localhost:8080/api/payment/webhook`
- Dev CORS: `setAllowedOriginPatterns("*")` — zmień na prod!
- Rate limit: in-memory sliding window (single instance)

