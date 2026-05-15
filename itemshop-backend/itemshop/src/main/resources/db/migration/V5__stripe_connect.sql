ALTER TABLE owners
    ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS stripe_connect_enabled    BOOLEAN NOT NULL DEFAULT FALSE;
