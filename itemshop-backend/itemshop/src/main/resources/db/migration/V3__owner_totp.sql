-- V3__owner_totp.sql
-- Adds TOTP secret and 2FA method selector to owners.

ALTER TABLE owners
    ADD COLUMN IF NOT EXISTS totp_secret       VARCHAR(64),
    ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(16) NOT NULL DEFAULT 'EMAIL';
