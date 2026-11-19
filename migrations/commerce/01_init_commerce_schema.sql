-- ==============================================================================
-- 10Q CHALLENGE LMS — COMMERCE SCHEMA INITIALIZATION (POSTGRESQL 16)
-- Schema: commerce
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS commerce;

-- 1. ORDERS TABLE
CREATE TABLE IF NOT EXISTS commerce.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(64) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL, -- References SQLite User ID
    course_id VARCHAR(64) NOT NULL,
    original_amount NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_payable_amount NUMERIC(10, 2) NOT NULL,
    coupon_id UUID,
    billing_full_name VARCHAR(150) NOT NULL,
    billing_email VARCHAR(150) NOT NULL,
    billing_phone VARCHAR(20),
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city VARCHAR(100),
    billing_state_code VARCHAR(2) NOT NULL, -- e.g. 'KA', 'MH', 'DL'
    billing_postal_code VARCHAR(10),
    billing_country_code VARCHAR(2) NOT NULL DEFAULT 'IN',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_orders_status CHECK (
        status IN ('PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'REFUND_REQUESTED', 'PARTIALLY_REFUNDED', 'REFUNDED')
    ),
    CONSTRAINT chk_orders_amounts CHECK (
        original_amount >= 0.00 AND discount_amount >= 0.00 AND net_payable_amount >= 0.00 AND
        net_payable_amount <= original_amount
    )
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON commerce.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON commerce.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON commerce.orders(created_at);

-- 2. PAYMENT ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS commerce.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    merchant_txn_id VARCHAR(64) UNIQUE NOT NULL,
    attempted_amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    gateway_name VARCHAR(32) NOT NULL DEFAULT 'PAYU',
    gateway_payment_id VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'INITIATED',
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    raw_request JSONB,
    raw_response JSONB,
    CONSTRAINT chk_payment_attempts_status CHECK (
        status IN ('INITIATED', 'SUBMITTED_TO_GATEWAY', 'SUCCESS', 'FAILED', 'EXPIRED')
    )
);

CREATE INDEX IF NOT EXISTS idx_attempts_order ON commerce.payment_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_attempts_txnid ON commerce.payment_attempts(merchant_txn_id);

-- 3. PAYMENTS TABLE (Authentic Settled Payments Only — Zero Synthetics)
CREATE TABLE IF NOT EXISTS commerce.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    payment_attempt_id UUID REFERENCES commerce.payment_attempts(id) ON DELETE RESTRICT,
    gateway_name VARCHAR(32) NOT NULL,
    gateway_payment_id VARCHAR(128) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    settlement_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    CONSTRAINT chk_payments_settlement_status CHECK (
        settlement_status IN ('PENDING', 'SETTLED', 'UNVERIFIED_HISTORICAL', 'FAILED', 'REVERSED', 'CANCELLED')
    ),
    CONSTRAINT uq_payments_order_settlement UNIQUE (order_id, settlement_status)
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON commerce.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON commerce.payments(gateway_payment_id);

-- 4. ENROLLMENTS TABLE (Safe Separation of Commerce Orders & Legacy Access)
CREATE TABLE IF NOT EXISTS commerce.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    user_id BIGINT NOT NULL,
    course_id VARCHAR(64) NOT NULL,
    settlement_status VARCHAR(32) NOT NULL DEFAULT 'SETTLED',
    enrollment_source VARCHAR(32) NOT NULL DEFAULT 'COMMERCE_ORDER',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_state VARCHAR(32) NOT NULL DEFAULT 'PROVISIONED',
    provenance_metadata JSONB,
    CONSTRAINT uq_enrollment_user_course UNIQUE (user_id, course_id),
    CONSTRAINT chk_enrollment_source_status CHECK (
        (enrollment_source IN ('COMMERCE_ORDER', 'INTERNAL_FREE_GRANT') AND settlement_status = 'SETTLED' AND order_id IS NOT NULL)
        OR
        (enrollment_source = 'LEGACY_MIGRATION' AND settlement_status = 'UNVERIFIED_HISTORICAL')
        OR
        (enrollment_source = 'MANUAL_REVIEW_QUARANTINE' AND settlement_status = 'UNVERIFIED_HISTORICAL')
    ),
    CONSTRAINT fk_enrollment_payment_settlement FOREIGN KEY (order_id, settlement_status)
        REFERENCES commerce.payments(order_id, settlement_status)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user ON commerce.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON commerce.enrollments(course_id);

-- 5. PAYMENT ANOMALIES TABLE (Durable Audit of Discrepancies)
CREATE TABLE IF NOT EXISTS commerce.payment_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    payment_attempt_id UUID,
    anomaly_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    raw_payload JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ENROLLMENT PAYMENT ORDERS (Audit Association for Repeat Purchases / Renewals)
CREATE TABLE IF NOT EXISTS commerce.enrollment_payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES commerce.enrollments(id) ON DELETE CASCADE,
    order_id UUID REFERENCES commerce.orders(id),
    payment_id UUID REFERENCES commerce.payments(id),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    relation_type VARCHAR(64) NOT NULL
);
