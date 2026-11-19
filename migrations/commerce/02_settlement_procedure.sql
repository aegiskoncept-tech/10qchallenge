-- ==============================================================================
-- 10Q CHALLENGE LMS — COMMERCE SETTLEMENT STORED PROCEDURES (POSTGRESQL 16)
-- Schema: commerce
-- ==============================================================================

CREATE OR REPLACE FUNCTION commerce.settle_payment_authoritative(
    p_order_id UUID,
    p_payment_attempt_id UUID,
    p_gateway_payment_id VARCHAR(128),
    p_verified_amount NUMERIC(10, 2),
    p_gateway_timestamp TIMESTAMPTZ,
    p_raw_payload JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    status_code VARCHAR(32),
    payment_id UUID,
    anomaly_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order commerce.orders%ROWTYPE;
    v_attempt commerce.payment_attempts%ROWTYPE;
    v_payment_id UUID;
    v_anomaly_id UUID;
    v_existing_payment commerce.payments%ROWTYPE;
    v_existing_enrollment commerce.enrollments%ROWTYPE;
BEGIN
    -- 1. Lock and retrieve Order
    SELECT * INTO v_order
    FROM commerce.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'ORDER_NOT_FOUND'::VARCHAR(32), NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- 2. Idempotency Check
    SELECT * INTO v_existing_payment
    FROM commerce.payments
    WHERE order_id = p_order_id AND settlement_status = 'SETTLED';

    IF FOUND THEN
        IF v_existing_payment.gateway_payment_id = p_gateway_payment_id THEN
            RETURN QUERY SELECT TRUE, 'ALREADY_SETTLED_IDEMPOTENT'::VARCHAR(32), v_existing_payment.id, NULL::UUID;
            RETURN;
        ELSE
            -- Conflict: Different transaction ID for already settled order
            INSERT INTO commerce.payment_anomalies (
                order_id, payment_attempt_id, anomaly_type, severity, raw_payload, detected_at
            ) VALUES (
                p_order_id, p_payment_attempt_id, 'DUPLICATE_PAYMENT_DIFFERENT_GATEWAY_ID', 'CRITICAL', p_raw_payload, NOW()
            ) RETURNING id INTO v_anomaly_id;

            RETURN QUERY SELECT FALSE, 'DUPLICATE_PAYMENT_CONFLICT'::VARCHAR(32), v_existing_payment.id, v_anomaly_id;
            RETURN;
        END IF;
    END IF;

    -- 3. Lock and validate payment attempt
    SELECT * INTO v_attempt
    FROM commerce.payment_attempts
    WHERE id = p_payment_attempt_id AND order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO commerce.payment_anomalies (
            order_id, payment_attempt_id, anomaly_type, severity, raw_payload, detected_at
        ) VALUES (
            p_order_id, p_payment_attempt_id, 'ORPHAN_SETTLEMENT_ATTEMPT_MISMATCH', 'HIGH', p_raw_payload, NOW()
        ) RETURNING id INTO v_anomaly_id;

        RETURN QUERY SELECT FALSE, 'ATTEMPT_MISMATCH'::VARCHAR(32), NULL::UUID, v_anomaly_id;
        RETURN;
    END IF;

    -- 4. Amount Verification
    IF p_verified_amount <> v_order.net_payable_amount OR p_verified_amount <> v_attempt.attempted_amount THEN
        INSERT INTO commerce.payment_anomalies (
            order_id, payment_attempt_id, anomaly_type, severity, raw_payload, detected_at
        ) VALUES (
            p_order_id, p_payment_attempt_id, 'AMOUNT_MISMATCH', 'CRITICAL',
            jsonb_build_object(
                'expected_order_amount', v_order.net_payable_amount,
                'expected_attempt_amount', v_attempt.attempted_amount,
                'verified_amount', p_verified_amount,
                'raw', p_raw_payload
            ), NOW()
        ) RETURNING id INTO v_anomaly_id;

        RETURN QUERY SELECT FALSE, 'AMOUNT_MISMATCH'::VARCHAR(32), NULL::UUID, v_anomaly_id;
        RETURN;
    END IF;

    -- 5. Insert Settled Payment
    INSERT INTO commerce.payments (
        order_id, payment_attempt_id, gateway_name, gateway_payment_id,
        amount, currency, settlement_status, settled_at, metadata
    ) VALUES (
        p_order_id, p_payment_attempt_id, 'PAYU', p_gateway_payment_id,
        p_verified_amount, 'INR', 'SETTLED', COALESCE(p_gateway_timestamp, NOW()), p_raw_payload
    ) RETURNING id INTO v_payment_id;

    -- 6. Update Attempt & Order Status
    UPDATE commerce.payment_attempts
    SET status = 'SUCCESS',
        gateway_payment_id = p_gateway_payment_id,
        completed_at = COALESCE(p_gateway_timestamp, NOW()),
        raw_response = p_raw_payload
    WHERE id = p_payment_attempt_id;

    UPDATE commerce.orders
    SET status = 'PAID',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 7. Provision Enrollment or link repeat purchase
    SELECT * INTO v_existing_enrollment
    FROM commerce.enrollments
    WHERE user_id = v_order.user_id AND course_id = v_order.course_id
    FOR UPDATE;

    IF FOUND THEN
        -- Enrollment already exists (e.g. repeat purchase/renewal)
        INSERT INTO commerce.enrollment_payment_orders (
            enrollment_id, order_id, payment_id, linked_at, relation_type
        ) VALUES (
            v_existing_enrollment.id, p_order_id, v_payment_id, NOW(), 'REPEAT_PURCHASE_ACTIVE_RENEWAL'
        );
    ELSE
        -- Insert new active enrollment
        INSERT INTO commerce.enrollments (
            order_id, user_id, course_id, settlement_status, enrollment_source,
            enrolled_at, access_state
        ) VALUES (
            p_order_id, v_order.user_id, v_order.course_id, 'SETTLED', 'COMMERCE_ORDER',
            NOW(), 'PROVISIONED'
        );
    END IF;

    RETURN QUERY SELECT TRUE, 'SETTLEMENT_SUCCESS'::VARCHAR(32), v_payment_id, NULL::UUID;
END;
$$;
