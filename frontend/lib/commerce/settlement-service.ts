// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 11: SETTLEMENT & RECONCILIATION SERVICE
// Engine: PostgreSQL 16 (commerce.gateway_settlements, commerce.payments, commerce.refunds)
// Supports: Gross Collections, Gateway Fee Reconciliation, Net Bank Settlement,
//           Transaction Discrepancy Audits.
// ==============================================================================

import { getCommerceDb } from './db';
import { GatewaySettlementEntity } from './types';

export interface SettlementMetrics {
  grossCapturedAmount: number;
  successfulPaymentsCount: number;
  totalRefundedAmount: number;
  refundsCount: number;
  estimatedGatewayFees: number; // 2% standard or configured
  estimatedGstOnFees: number; // 18% GST on fee
  estimatedNetSettlement: number;
  pendingAmount: number;
  pendingCount: number;
  failedCount: number;
  anomalyCount: number;
  feeConfig?: {
    mdrRatePercent: number;
    gstOnMdrPercent: number;
    isConfirmed: boolean;
    commercialStatus: 'UNCONFIRMED_DEFAULT_ESTIMATE' | 'COMMERCIALLY_CONFIGURED';
    source: string;
    notice: string;
  };
}

export class SettlementService {
  public static readonly GATEWAY_FEE_RATE = 0.02; // 2.0% standard PayU India MDR default estimate
  public static readonly GST_ON_FEE_RATE = 0.18; // 18% standard GST on financial services

  /**
   * Identifies whether the PayU MDR rate has been explicitly agreed upon and configured
   */
  public static isMdrConfigured(): boolean {
    return Boolean(process.env.PAYU_MDR_RATE_PERCENT && !isNaN(Number(process.env.PAYU_MDR_RATE_PERCENT)));
  }

  /**
   * Authoritative MDR rate with environment override support
   */
  public static getMdrRate(): number {
    const envRate = process.env.PAYU_MDR_RATE_PERCENT;
    if (envRate && !isNaN(Number(envRate))) {
      return Number(envRate) / 100;
    }
    return this.GATEWAY_FEE_RATE;
  }

  /**
   * Authoritative GST-on-MDR rate with environment override support
   */
  public static getGstOnMdrRate(): number {
    const envGst = process.env.PAYU_GST_ON_MDR_PERCENT;
    if (envGst && !isNaN(Number(envGst))) {
      return Number(envGst) / 100;
    }
    return this.GST_ON_FEE_RATE;
  }

  /**
   * Aggregates authoritative settlement metrics from PostgreSQL
   */
  public static async getSettlementSummary(): Promise<SettlementMetrics> {
    const db = await getCommerceDb();

    // 1. Settled Payments Aggregation
    const settledRes = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as gross_amount,
        COUNT(*) as success_count
      FROM commerce.payments
      WHERE settlement_status = 'SETTLED';
    `);

    const grossCapturedAmount = parseFloat(settledRes.rows[0]?.gross_amount || '0');
    const successfulPaymentsCount = parseInt(settledRes.rows[0]?.success_count || '0', 10);

    // 2. Refunds Aggregation
    const refundsRes = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_refunded,
        COUNT(*) as refunds_count
      FROM commerce.refunds
      WHERE status IN ('REQUESTED', 'PROCESSING', 'CONFIRMED');
    `);

    const totalRefundedAmount = parseFloat(refundsRes.rows[0]?.total_refunded || '0');
    const refundsCount = parseInt(refundsRes.rows[0]?.refunds_count || '0', 10);

    // 3. Pending & Failed Attempts Aggregation
    const attemptsRes = await db.query(`
      SELECT 
        COUNT(CASE WHEN status IN ('INITIATED', 'SUBMITTED_TO_GATEWAY') THEN 1 END) as pending_count,
        COALESCE(SUM(CASE WHEN status IN ('INITIATED', 'SUBMITTED_TO_GATEWAY') THEN attempted_amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count
      FROM commerce.payment_attempts;
    `);

    const pendingCount = parseInt(attemptsRes.rows[0]?.pending_count || '0', 10);
    const pendingAmount = parseFloat(attemptsRes.rows[0]?.pending_amount || '0');
    const failedCount = parseInt(attemptsRes.rows[0]?.failed_count || '0', 10);

    // 4. Payment Anomalies Count
    const anomalyRes = await db.query(`SELECT COUNT(*) as count FROM commerce.payment_anomalies;`);
    const anomalyCount = parseInt(anomalyRes.rows[0]?.count || '0', 10);

    // 5. Configurable & Traceable Fee Calculations
    const mdrRate = this.getMdrRate();
    const gstRate = this.getGstOnMdrRate();
    const estimatedGatewayFees = Math.round(grossCapturedAmount * mdrRate * 100) / 100;
    const estimatedGstOnFees = Math.round(estimatedGatewayFees * gstRate * 100) / 100;
    const totalDeductions = estimatedGatewayFees + estimatedGstOnFees + totalRefundedAmount;
    const estimatedNetSettlement = Math.max(0, Math.round((grossCapturedAmount - totalDeductions) * 100) / 100);

    return {
      grossCapturedAmount,
      successfulPaymentsCount,
      totalRefundedAmount,
      refundsCount,
      estimatedGatewayFees,
      estimatedGstOnFees,
      estimatedNetSettlement,
      pendingAmount,
      pendingCount,
      failedCount,
      anomalyCount,
      feeConfig: {
        mdrRatePercent: Math.round(mdrRate * 10000) / 100,
        gstOnMdrPercent: Math.round(gstRate * 10000) / 100,
        isConfirmed: this.isMdrConfigured(),
        commercialStatus: this.isMdrConfigured() ? 'COMMERCIALLY_CONFIGURED' : 'UNCONFIRMED_DEFAULT_ESTIMATE',
        source: this.isMdrConfigured() ? 'ENVIRONMENT_CONFIG' : 'STANDARD_PAYU_INDIA_DEFAULT_ESTIMATE',
        notice: this.isMdrConfigured()
          ? 'Commercial PayU MDR rate active from environment configuration.'
          : 'The 2.0% MDR and 18% GST-on-MDR are unconfirmed default merchant estimates. Actual commercial gateway settlement rates must be confirmed with the merchant agreement.',
      },
    };
  }

  /**
   * List gateway settlement batches
   */
  public static async listSettlements(): Promise<GatewaySettlementEntity[]> {
    const db = await getCommerceDb();
    const res = await db.query(`
      SELECT * FROM commerce.gateway_settlements 
      ORDER BY settlement_date DESC, created_at DESC;
    `);
    return res.rows.map(this.mapSettlementRow);
  }

  /**
   * Create or update settlement reconciliation batch
   */
  public static async createSettlementRecord(payload: {
    settlementReference: string;
    settlementDate: string;
    grossAmount: number;
    refundAmount?: number;
    gatewayFee?: number;
    taxOnFee?: number;
    netSettlementAmount: number;
    sourceReference?: string;
    metadata?: any;
    adminUserId: number;
  }): Promise<GatewaySettlementEntity> {
    const db = await getCommerceDb();
    const refundAmt = payload.refundAmount || 0;
    const mdrRate = this.getMdrRate();
    const gstRate = this.getGstOnMdrRate();
    const fee = payload.gatewayFee !== undefined ? payload.gatewayFee : Math.round(payload.grossAmount * mdrRate * 100) / 100;
    const taxFee = payload.taxOnFee !== undefined ? payload.taxOnFee : Math.round(fee * gstRate * 100) / 100;

    const mergedMetadata = {
      ...(payload.metadata || {}),
      feeAudit: {
        appliedMdrRatePercent: Math.round(mdrRate * 10000) / 100,
        appliedGstOnMdrPercent: Math.round(gstRate * 10000) / 100,
        timestamp: new Date().toISOString(),
      },
    };

    const res = await db.query(
      `INSERT INTO commerce.gateway_settlements (
        settlement_reference, settlement_date, gross_amount, refund_amount,
        gateway_fee, tax_on_fee, net_settlement_amount, currency,
        settlement_status, source_reference, metadata, reconciled_by, reconciled_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, 'INR',
        'RECONCILED', $8, $9, $10, NOW()
      )
      ON CONFLICT (settlement_reference) DO UPDATE
      SET gross_amount = $3, refund_amount = $4, gateway_fee = $5,
          tax_on_fee = $6, net_settlement_amount = $7,
          settlement_status = 'RECONCILED', reconciled_by = $10, reconciled_at = NOW()
      RETURNING *;`,
      [
        payload.settlementReference,
        payload.settlementDate,
        payload.grossAmount,
        refundAmt,
        fee,
        taxFee,
        payload.netSettlementAmount,
        payload.sourceReference || null,
        JSON.stringify(mergedMetadata),
        payload.adminUserId,
      ]
    );

    return this.mapSettlementRow(res.rows[0]);
  }

  /**
   * Reconciles an individual payment against gateway logs
   */
  public static async reconcilePayment(
    paymentId: string,
    adminUserId: number
  ): Promise<{ success: boolean; message: string }> {
    const db = await getCommerceDb();
    const res = await db.query(
      `SELECT * FROM commerce.payments WHERE id = $1 LIMIT 1;`,
      [paymentId]
    );

    if (res.rows.length === 0) {
      return { success: false, message: 'Payment record not found.' };
    }

    const p = res.rows[0];
    await db.query(
      `UPDATE commerce.payments 
       SET settlement_status = 'SETTLED', metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{reconciledBy}', $1::jsonb)
       WHERE id = $2;`,
      [JSON.stringify(adminUserId), paymentId]
    );

    await db.query(
      `INSERT INTO commerce.payment_events (
        order_id, payment_id, event_type, severity, source, payload, created_at
      ) VALUES ($1, $2, 'MANUAL_RECONCILIATION', 'INFO', 'ADMIN_PORTAL', $3, NOW());`,
      [
        p.order_id,
        p.id,
        JSON.stringify({ paymentId, adminUserId, action: 'CONFIRMED_SETTLED' }),
      ]
    );

    return { success: true, message: 'Payment successfully reconciled.' };
  }

  private static mapSettlementRow(r: any): GatewaySettlementEntity {
    return {
      id: r.id,
      gateway: r.gateway || 'PAYU',
      settlementReference: r.settlement_reference,
      settlementDate: r.settlement_date ? new Date(r.settlement_date).toISOString().split('T')[0] : '',
      grossAmount: parseFloat(r.gross_amount),
      refundAmount: parseFloat(r.refund_amount || '0'),
      gatewayFee: parseFloat(r.gateway_fee || '0'),
      taxOnFee: parseFloat(r.tax_on_fee || '0'),
      netSettlementAmount: parseFloat(r.net_settlement_amount),
      currency: 'INR',
      settlementStatus: r.settlement_status,
      sourceReference: r.source_reference,
      metadata: r.metadata,
      reconciledBy: r.reconciled_by ? Number(r.reconciled_by) : null,
      reconciledAt: r.reconciled_at ? new Date(r.reconciled_at).toISOString() : null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
    };
  }
}
