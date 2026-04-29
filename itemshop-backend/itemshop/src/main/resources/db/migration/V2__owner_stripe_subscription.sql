-- V2__owner_stripe_subscription.sql
-- Adds Stripe customer/subscription tracking and subscription expiry to owners.

ALTER TABLE owners
    ADD COLUMN IF NOT EXISTS stripe_customer_id      VARCHAR(64),
    ADD COLUMN IF NOT EXISTS stripe_subscription_id  VARCHAR(64),
    ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
