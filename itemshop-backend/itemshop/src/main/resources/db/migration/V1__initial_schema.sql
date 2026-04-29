-- V1__initial_schema.sql
-- Pełny schemat bazy danych ItemShop.
-- Flyway uruchomi ten skrypt tylko jeśli tabele nie istnieją (baseline-on-migrate=true).

CREATE TABLE IF NOT EXISTS owners (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password            VARCHAR(255) NOT NULL,
    subscription_plan   VARCHAR(255) NOT NULL DEFAULT 'FREE',
    role                VARCHAR(32)  NOT NULL DEFAULT 'USER',
    email_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    two_factor_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    phone_number        VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS shops (
    id                   BIGSERIAL PRIMARY KEY,
    server_name          VARCHAR(255),
    server_ip            VARCHAR(255),
    theme                VARCHAR(255) DEFAULT 'default',
    custom_domain        VARCHAR(255) UNIQUE,
    api_key              VARCHAR(255) NOT NULL UNIQUE,
    daily_reward_command TEXT         DEFAULT 'give {player} emerald 1',
    daily_reward_name    VARCHAR(255) DEFAULT 'Darmowa Nagroda 24h',
    discord_link         VARCHAR(255) DEFAULT 'https://discord.gg/twoj-serwer',
    banner_text          VARCHAR(255) DEFAULT 'DOŁĄCZ DO ŚWIATA SKLEPU TERAZ',
    terms_content        TEXT         DEFAULT '1. Postanowienia ogólne',
    owner_id             BIGINT       NOT NULL REFERENCES owners(id)
);

CREATE TABLE IF NOT EXISTS products (
    id             BIGSERIAL PRIMARY KEY,
    shop_id        BIGINT        NOT NULL REFERENCES shops(id),
    name           VARCHAR(255),
    description    VARCHAR(255),
    icon_emoji     VARCHAR(255),
    image_url      VARCHAR(1000),
    price          DOUBLE PRECISION DEFAULT 0.0,
    required_slots INTEGER          DEFAULT 1,
    mode           VARCHAR(255),
    position       INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_commands (
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    command    VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS shop_modes (
    id          BIGSERIAL PRIMARY KEY,
    shop_id     BIGINT       NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name        VARCHAR(255),
    description TEXT,
    image_url   VARCHAR(1000)
);

CREATE TABLE IF NOT EXISTS pending_items (
    id              BIGSERIAL PRIMARY KEY,
    shop_id         BIGINT       NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    player_name     VARCHAR(255),
    item_name       VARCHAR(255),
    reward_command  TEXT,
    mode            VARCHAR(255),
    required_slots  INTEGER  NOT NULL DEFAULT 1,
    claimed         BOOLEAN  NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP         DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_item_plugin_lookup
    ON pending_items (shop_id, player_name, mode, claimed);

CREATE INDEX IF NOT EXISTS idx_pending_item_shop
    ON pending_items (shop_id);

CREATE TABLE IF NOT EXISTS orders (
    id          BIGSERIAL PRIMARY KEY,
    nickname    VARCHAR(255),
    status      VARCHAR(255),
    created_at  TIMESTAMP DEFAULT NOW(),
    product_id  BIGINT REFERENCES products(id) ON DELETE SET NULL,
    shop_id     BIGINT REFERENCES shops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_rewards (
    id           BIGSERIAL PRIMARY KEY,
    player_name  VARCHAR(255) NOT NULL,
    server_name  VARCHAR(255) NOT NULL,
    mode         VARCHAR(255) NOT NULL,
    last_claimed TIMESTAMP    NOT NULL,
    CONSTRAINT uq_daily_reward_player_server_mode UNIQUE (player_name, server_name, mode)
);

CREATE INDEX IF NOT EXISTS idx_daily_reward_lookup
    ON daily_rewards (player_name, server_name, mode);

CREATE TABLE IF NOT EXISTS player_wallets (
    id       BIGSERIAL PRIMARY KEY,
    nickname VARCHAR(255) NOT NULL UNIQUE,
    points   INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lootbox_rewards (
    id      BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name    VARCHAR(255),
    command TEXT,
    weight  INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS auth_codes (
    id                    BIGSERIAL PRIMARY KEY,
    email                 VARCHAR(255)  NOT NULL,
    purpose               VARCHAR(32)   NOT NULL,
    code_hash             VARCHAR(128)  NOT NULL,
    pending_password_hash TEXT,
    created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
    expires_at            TIMESTAMP     NOT NULL,
    attempts              INTEGER       NOT NULL DEFAULT 0,
    max_attempts          INTEGER       NOT NULL DEFAULT 5,
    used                  BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS blacklisted_tokens (
    id             BIGSERIAL PRIMARY KEY,
    jti            VARCHAR(64)  NOT NULL UNIQUE,
    expires_at     TIMESTAMP    NOT NULL,
    blacklisted_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blacklisted_token_jti
    ON blacklisted_tokens (jti);

CREATE INDEX IF NOT EXISTS idx_blacklisted_token_expires
    ON blacklisted_tokens (expires_at);

CREATE TABLE IF NOT EXISTS processed_stripe_events (
    event_id     VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW()
);
