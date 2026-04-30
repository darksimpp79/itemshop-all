CREATE TABLE promo_codes (
    id          BIGSERIAL PRIMARY KEY,
    shop_id     BIGINT       NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    code        VARCHAR(50)  NOT NULL,
    discount_percent INT     NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    max_uses    INT,
    current_uses INT         NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    expires_at  TIMESTAMP,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shop_id, code)
);

CREATE INDEX idx_promo_codes_shop_id ON promo_codes(shop_id);
