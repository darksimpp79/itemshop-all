# ItemShop

SaaS platforma sklepów dla serwerów Minecraft. Właściciel serwera tworzy sklep, dodaje produkty i tryby gry — gracze kupują przez Stripe, a nagrody trafiają automatycznie do gry przez plugin PaperMC.

## Architektura

```
itemshop-all/
├── itemshop-backend/   Spring Boot (Java 21) — API, płatności, auth
├── itemshop-front/     Next.js 15 (App Router, Tailwind) — panel admina + storefront
└── itemshop-plugin/    PaperMC plugin — odbieranie nagród w grze
```

```
Gracz/Admin → Cloudflare → Nginx → Frontend (Next.js :3000)
                                 → Backend  (Spring Boot :8080)
                                 → Postgres + Redis (wewnętrzne)
Plugin MC   ──────────────────────→ Backend /api/storefront/*
```

## Wymagania

- Docker + Docker Compose (v2)
- Domena z DNS (np. Cloudflare)
- Konto [Stripe](https://stripe.com) (płatności)
- Konto [Resend](https://resend.com) (emaile weryfikacyjne)
- Certyfikat SSL (`fullchain.pem` + `privkey.pem`)

## Lokalne środowisko deweloperskie

```bash
# Backend
cd itemshop-backend/itemshop
./gradlew bootRun

# Frontend (osobny terminal)
cd itemshop-front
npm install
npm run dev

# Plugin
cd itemshop-plugin/Itemshop
./gradlew shadowJar
```

Frontend dostępny na `http://localhost:3000`, backend na `http://localhost:8080`.

> Next.js automatycznie proxy-uje `/api/*` → backend przez `next.config.ts`.

## Deployment produkcyjny

### 1. Przygotuj serwer (Ubuntu 24.04)

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Pobierz projekt

```bash
git clone https://github.com/TWOJ_USER/itemshop-all.git
cd itemshop-all
```

### 3. Skonfiguruj zmienne środowiskowe

```bash
cp .env.example .env
nano .env          # uzupełnij wszystkie wartości
chmod 600 .env
```

### 4. Certyfikat SSL

Wstaw certyfikat Let's Encrypt (lub inny) do folderu `nginx/certs/`:

```bash
mkdir -p nginx/certs

# Opcja A — Certbot (Let's Encrypt)
sudo apt install certbot
sudo certbot certonly --standalone -d pumpking.club -d api.pumpking.club -d "*.pumpking.club"
sudo cp /etc/letsencrypt/live/pumpking.club/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/pumpking.club/privkey.pem  nginx/certs/
sudo chown $USER:$USER nginx/certs/*

# Opcja B — Cloudflare (Origin Certificate)
# Wygeneruj w Cloudflare Dashboard → SSL/TLS → Origin Server
# Wklej oba pliki do nginx/certs/
```

### 5. Uruchom

```bash
docker compose build
docker compose up -d
docker compose logs -f backend   # poczekaj na "Started ItemshopApplication"
```

### 6. DNS

W panelu DNS (Cloudflare lub inny) dodaj rekordy A:

| Nazwa | Typ | Wartość |
|---|---|---|
| `pumpking.club` | A | `IP_SERWERA` |
| `*.pumpking.club` | A | `IP_SERWERA` |
| `api.pumpking.club` | A | `IP_SERWERA` |

### 7. Stripe Webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://api.pumpking.club/api/payment/webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`

## Zmienne środowiskowe

| Zmienna | Opis |
|---|---|
| `DB_USER` | Użytkownik PostgreSQL |
| `DB_PASSWORD` | Hasło PostgreSQL (silne!) |
| `JWT_SECRET` | Losowy string min. 32 znaki (`openssl rand -base64 48`) |
| `STRIPE_API_KEY` | Klucz Stripe (`sk_live_...` lub `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret webhooka Stripe (`whsec_...`) |
| `STRIPE_PRICE_PRO_MONTHLY` | Price ID planu PRO (`price_...`) |
| `STRIPE_PRICE_STARTER_MONTHLY` | Price ID planu STARTER (`price_...`) |
| `RESEND_API_KEY` | Klucz API Resend (`re_...`) |
| `APP_BASE_URL` | URL backendu (`https://api.pumpking.club`) |
| `FRONTEND_BASE_URL` | URL frontendu (`https://pumpking.club`) |
| `CORS_ALLOWED_ORIGINS` | Dozwolone originy (`https://pumpking.club,https://*.pumpking.club`) |

## Stripe — pierwsze uruchomienie

1. Utwórz dwa produkty w Stripe Dashboard (Products → Add product):
   - `ItemShop STARTER` — cena miesięczna (np. 9.99 PLN)
   - `ItemShop PRO` — cena miesięczna (np. 29.99 PLN)
2. Skopiuj `Price ID` każdego produktu do `.env`
3. Zarejestruj webhook (krok 7 powyżej)

## Aktualizacja

```bash
git pull
docker compose build
docker compose up -d
```

Flyway automatycznie wykryje i zastosuje nowe migracje bazy danych.

## Plugin Minecraft

Zbudowany plik `.jar` znajdziesz w:
```
itemshop-plugin/Itemshop/build/libs/Itemshop-*.jar
```

Wrzuć do folderu `plugins/` serwera PaperMC i skonfiguruj `config.yml`:

```yaml
api-url: "https://api.pumpking.club"
api-key: "sk_KLUCZ_Z_PANELU_ADMINA"
server-name: "nazwaserwera"
server-mode: "Survival"
```

## Plany subskrypcji

| | FREE | STARTER | PRO |
|---|---|---|---|
| Sklepy | 1 | 3 | nielimitowane |
| Tryby gry | 1 | 3 | nielimitowane |
| Motywy | default | wszystkie | wszystkie |
| Kody promo | — | tak | tak |
| Lootbox | — | tak | tak |
| Własna domena | — | — | tak |
