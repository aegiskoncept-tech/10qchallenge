-- ==============================================================================
-- 10Q CHALLENGE LMS — FEATURE 12: INVOICES & BILLING SCHEMA (POSTGRESQL 16)
-- Schema: commerce
-- Adds: commerce.invoice_number_seq, commerce.invoices table, indexes, and
--       safe backfill procedure for historical paid orders.
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS commerce;

-- 1. CONCURRENCY-SAFE INVOICE NUMBER SEQUENCE
CREATE SEQUENCE IF NOT EXISTS commerce.invoice_number_seq START WITH 1 INCREMENT BY 1;

-- 2. INVOICES TABLE
CREATE TABLE IF NOT EXISTS commerce.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    order_id UUID UNIQUE NOT NULL REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES commerce.payments(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL,

    -- Immutable Billing Snapshot
    billing_full_name VARCHAR(150) NOT NULL,
    billing_email VARCHAR(150) NOT NULL,
    billing_phone VARCHAR(20),
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city VARCHAR(100),
    billing_state_code VARCHAR(10),
    billing_postal_code VARCHAR(20),
    billing_country_code VARCHAR(10) NOT NULL DEFAULT 'IN',

    -- Financial Breakdown (Direct manual pricing: zero assumed GST)
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    original_amount NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    coupon_code VARCHAR(64),
    final_amount NUMERIC(10, 2) NOT NULL,

    -- Gateway & Transaction Identification
    gateway_name VARCHAR(32) NOT NULL DEFAULT 'PAYU',
    gateway_payment_id VARCHAR(128) NOT NULL,
    merchant_txn_id VARCHAR(64) NOT NULL,

    -- Lifecycle & Audit
    status VARCHAR(32) NOT NULL DEFAULT 'ISSUED',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_invoice_status CHECK (
        status IN ('ISSUED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED')
    ),
    CONSTRAINT chk_invoice_amounts CHECK (
        original_amount >= 0.00 AND discount_amount >= 0.00 AND final_amount >= 0.00
    )
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON commerce.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON commerce.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON commerce.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issued ON commerce.invoices(issued_at);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON commerce.invoices(invoice_number);

-- 3. IDEMPOTENT BACKFILL FOR VERIFIED HISTORICAL SETTLED ORDERS
DO $$
DECLARE
    rec RECORD;
    v_seq_val BIGINT;
    v_inv_num VARCHAR(64);
    v_year VARCHAR(4);
    v_inv_status VARCHAR(32);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');

    FOR rec IN 
        SELECT 
            o.id AS order_id,
            o.user_id,
            o.status AS order_status,
            o.billing_full_name,
            o.billing_email,
            o.billing_phone,
            o.billing_address_line1,
            o.billing_address_line2,
            o.billing_city,
            o.billing_state_code,
            o.billing_postal_code,
            o.billing_country_code,
            o.currency,
            o.original_amount,
            o.discount_amount,
            o.coupon_code,
            o.net_payable_amount AS final_amount,
            o.created_at AS order_created_at,
            p.id AS payment_id,
            p.gateway_name,
            p.gateway_payment_id,
            COALESCE(pa.merchant_txn_id, 'HISTORICAL-' || SUBSTRING(o.id::text, 1, 8)) AS merchant_txn_id,
            COALESCE(p.settled_at, o.completed_at, o.created_at) AS issued_at
        FROM commerce.orders o
        INNER JOIN commerce.payments p ON p.order_id = o.id AND p.settlement_status = 'SETTLED'
        LEFT JOIN commerce.payment_attempts pa ON pa.id = p.payment_attempt_id
        WHERE o.status IN ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
          AND NOT EXISTS (SELECT 1 FROM commerce.invoices i WHERE i.order_id = o.id)
        ORDER BY o.created_at ASC
    LOOP
        v_seq_val := nextval('commerce.invoice_number_seq');
        v_inv_num := '10Q-INV-' || v_year || '-' || LPAD(v_seq_val::text, 5, '0');

        IF rec.order_status = 'PARTIALLY_REFUNDED' THEN
            v_inv_status := 'PARTIALLY_REFUNDED';
        ELSIF rec.order_status = 'REFUNDED' THEN
            v_inv_status := 'REFUNDED';
        ELSE
            v_inv_status := 'ISSUED';
        END IF;

        INSERT INTO commerce.invoices (
            invoice_number,
            order_id,
            payment_id,
            user_id,
            billing_full_name,
            billing_email,
            billing_phone,
            billing_address_line1,
            billing_address_line2,
            billing_city,
            billing_state_code,
            billing_postal_code,
            billing_country_code,
            currency,
            original_amount,
            discount_amount,
            coupon_code,
            final_amount,
            gateway_name,
            gateway_payment_id,
            merchant_txn_id,
            status,
            issued_at,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            v_inv_num,
            rec.order_id,
            rec.payment_id,
            rec.user_id,
            rec.billing_full_name,
            rec.billing_email,
            rec.billing_phone,
            rec.billing_address_line1,
            rec.billing_address_line2,
            rec.billing_city,
            rec.billing_state_code,
            rec.billing_postal_code,
            rec.billing_country_code,
            rec.currency,
            rec.original_amount,
            rec.discount_amount,
            rec.coupon_code,
            rec.final_amount,
            rec.gateway_name,
            rec.gateway_payment_id,
            rec.merchant_txn_id,
            v_inv_status,
            rec.issued_at,
            jsonb_build_object('backfilled', true, 'backfilled_at', NOW()),
            rec.issued_at,
            NOW()
        );
    END LOOP;
END $$;
