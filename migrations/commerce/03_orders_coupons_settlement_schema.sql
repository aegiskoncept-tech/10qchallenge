-- ==============================================================================
-- 10Q CHALLENGE LMS — FEATURE 11: ORDERS, COUPONS & SETTLEMENT SCHEMA (POSTGRESQL 16)
-- Schema: commerce
-- Adds: Order Items, Coupons Ledger, Coupon Redemptions, Refunds, Payment Events,
--       and Gateway Settlements.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS commerce;

-- 1. EXTEND COMMERCE.ORDERS WITH TAX BREAKDOWN AND LIFECYCLE FIELDS
ALTER TABLE commerce.orders
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS tax_inclusive_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill tax_inclusive_amount and completed_at for existing paid orders
UPDATE commerce.orders
SET tax_inclusive_amount = COALESCE(tax_inclusive_amount, net_payable_amount),
    tax_amount = COALESCE(tax_amount, ROUND(net_payable_amount - (net_payable_amount / 1.18), 2)),
    completed_at = CASE WHEN status = 'PAID' AND completed_at IS NULL THEN updated_at ELSE completed_at END
WHERE tax_inclusive_amount IS NULL;

-- 2. ORDER ITEMS TABLE (Immutable snapshot of purchased courses)
CREATE TABLE IF NOT EXISTS commerce.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
    product_type VARCHAR(32) NOT NULL DEFAULT 'COURSE',
    product_id VARCHAR(64) NOT NULL,
    product_title_snapshot VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    tax_rate_snapshot NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON commerce.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON commerce.order_items(product_id);

-- Backfill order_items for existing historical orders if missing
INSERT INTO commerce.order_items (
    order_id, product_type, product_id, product_title_snapshot,
    quantity, unit_price, tax_rate_snapshot, tax_amount, discount_amount, line_total, created_at
)
SELECT 
    o.id,
    'COURSE',
    o.course_id,
    'BITSAT 2026 Master Crash Course (Updated Batch)',
    1,
    o.original_amount,
    18.00,
    ROUND(o.net_payable_amount - (o.net_payable_amount / 1.18), 2),
    o.discount_amount,
    o.net_payable_amount,
    o.created_at
FROM commerce.orders o
WHERE NOT EXISTS (
    SELECT 1 FROM commerce.order_items oi WHERE oi.order_id = o.id
);

-- 3. COUPONS TABLE (Authoritative PostgreSQL Coupon Master)
CREATE TABLE IF NOT EXISTS commerce.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(16) NOT NULL,
    discount_value NUMERIC(10, 2) NOT NULL,
    minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    maximum_discount_amount NUMERIC(10, 2),
    total_redemption_limit INT,
    per_student_redemption_limit INT NOT NULL DEFAULT 1,
    applicable_courses JSONB DEFAULT '[]'::jsonb,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    times_redeemed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_coupon_discount_type CHECK (
        discount_type IN ('PERCENTAGE', 'FLAT')
    ),
    CONSTRAINT chk_coupon_discount_positive CHECK (
        discount_value > 0.00 AND minimum_order_amount >= 0.00
    )
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON commerce.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON commerce.coupons(is_active);

-- Seed canonical coupons into PostgreSQL idempotently
INSERT INTO commerce.coupons (
    code, description, discount_type, discount_value, minimum_order_amount,
    maximum_discount_amount, total_redemption_limit, per_student_redemption_limit,
    applicable_courses, starts_at, expires_at, is_active, times_redeemed
) VALUES
(
    'BITSAT500',
    'Flat ₹500 discount for BITSAT Champions batch enrollments.',
    'FLAT',
    500.00,
    2000.00,
    500.00,
    500,
    1,
    '["1"]'::jsonb,
    '2026-11-01T00:00:00Z',
    '2026-12-31T23:59:59Z',
    TRUE,
    42
),
(
    'EARLYBIRD',
    '20% off for early aspirant enrollments.',
    'PERCENTAGE',
    20.00,
    1000.00,
    1000.00,
    200,
    1,
    '[]'::jsonb,
    '2026-11-01T00:00:00Z',
    '2026-12-31T23:59:59Z',
    TRUE,
    78
),
(
    'RANKER10',
    '10% discount on all mock test series and course packs.',
    'PERCENTAGE',
    10.00,
    500.00,
    500.00,
    1000,
    2,
    '[]'::jsonb,
    '2026-11-01T00:00:00Z',
    '2027-06-30T23:59:59Z',
    TRUE,
    115
)
ON CONFLICT (code) DO NOTHING;

-- 4. COUPON REDEMPTIONS TABLE (Concurrency-Safe Reservation & Audit)
CREATE TABLE IF NOT EXISTS commerce.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES commerce.coupons(id) ON DELETE RESTRICT,
    student_id BIGINT NOT NULL,
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
    discount_amount NUMERIC(10, 2) NOT NULL,
    redemption_status VARCHAR(32) NOT NULL DEFAULT 'RESERVED',
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    CONSTRAINT chk_redemption_status CHECK (
        redemption_status IN ('RESERVED', 'CONFIRMED', 'RELEASED', 'CANCELLED')
    ),
    CONSTRAINT uq_order_coupon UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_student ON commerce.coupon_redemptions(student_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON commerce.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order ON commerce.coupon_redemptions(order_id);

-- 5. REFUNDS TABLE (Full & Partial Gateway Refund Records)
CREATE TABLE IF NOT EXISTS commerce.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES commerce.payments(id) ON DELETE RESTRICT,
    refund_reference VARCHAR(64) UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    reason TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    gateway_refund_id VARCHAR(128),
    initiated_by BIGINT NOT NULL,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_refund_status CHECK (
        status IN ('REQUESTED', 'PROCESSING', 'CONFIRMED', 'FAILED', 'REJECTED')
    ),
    CONSTRAINT chk_refund_amount CHECK (amount > 0.00)
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON commerce.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON commerce.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON commerce.refunds(status);

-- 6. PAYMENT EVENTS TABLE (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS commerce.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES commerce.orders(id) ON DELETE SET NULL,
    payment_attempt_id UUID REFERENCES commerce.payment_attempts(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES commerce.payments(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO',
    source VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order ON commerce.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON commerce.payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_created ON commerce.payment_events(created_at DESC);

-- 7. GATEWAY SETTLEMENTS TABLE (Reconciliation & Fee Reporting)
CREATE TABLE IF NOT EXISTS commerce.gateway_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway VARCHAR(32) NOT NULL DEFAULT 'PAYU',
    settlement_reference VARCHAR(64) UNIQUE NOT NULL,
    settlement_date DATE NOT NULL,
    gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gateway_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_on_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_settlement_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    settlement_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    source_reference VARCHAR(128),
    metadata JSONB,
    reconciled_by BIGINT,
    reconciled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_settlement_status CHECK (
        settlement_status IN ('PENDING', 'RECONCILED', 'DISCREPANCY')
    )
);

CREATE INDEX IF NOT EXISTS idx_settlements_date ON commerce.gateway_settlements(settlement_date DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON commerce.gateway_settlements(settlement_status);
