// ==============================================================================
// 10Q CHALLENGE LMS — PHASE 4.2 COMMERCE CORE TYPES
// Engine: PostgreSQL 16 (Commerce) & SQLite (Identity/Auth)
// Framework: Next.js 16 + TypeScript
// ==============================================================================

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type PaymentAttemptStatus =
  | 'INITIATED'
  | 'SUBMITTED_TO_GATEWAY'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED';

export type SettlementStatus =
  | 'PENDING'
  | 'SETTLED'
  | 'UNVERIFIED_HISTORICAL'
  | 'FAILED'
  | 'REVERSED'
  | 'CANCELLED';

export type EnrollmentSource =
  | 'COMMERCE_ORDER'
  | 'INTERNAL_FREE_GRANT'
  | 'LEGACY_MIGRATION'
  | 'MANUAL_REVIEW_QUARANTINE';

export type AccessState =
  | 'PROVISIONED'
  | 'ACTIVE'
  | 'REVOKED'
  | 'EXPIRED';

export interface OrderEntity {
  id: string; // UUID
  orderNumber: string;
  userId: number; // Linked to SQLite User ID
  courseId: string; // Course ID from courses.json
  originalAmount: number; // in INR (two decimal precision)
  discountAmount: number;
  netPayableAmount: number;
  couponId?: string | null;
  billingFullName: string;
  billingEmail: string;
  billingPhone?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingStateCode: string; // 2-letter state code e.g. 'KA', 'MH'
  billingPostalCode?: string | null;
  billingCountryCode: string; // 'IN'
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAttemptEntity {
  id: string; // UUID
  orderId: string;
  merchantTxnId: string; // e.g. 10Q_TXN_...
  attemptedAmount: number;
  currency: 'INR';
  gatewayName: 'PAYU';
  gatewayPaymentId?: string | null; // PayU mihpayid
  status: PaymentAttemptStatus;
  initiatedAt: string;
  completedAt?: string | null;
  rawRequest?: any;
  rawResponse?: any;
}

export interface PaymentEntity {
  id: string; // UUID
  orderId: string;
  paymentAttemptId: string;
  gatewayName: 'PAYU' | 'INTERNAL_FREE_GRANT' | 'LEGACY';
  gatewayPaymentId: string;
  amount: number;
  currency: 'INR';
  settlementStatus: SettlementStatus;
  settledAt: string;
  metadata?: any;
}

export interface EnrollmentEntity {
  id: string; // UUID
  orderId?: string | null;
  userId: number;
  courseId: string;
  settlementStatus: SettlementStatus;
  enrollmentSource: EnrollmentSource;
  enrolledAt: string;
  accessState: AccessState;
  provenanceMetadata?: any;
}

export interface PaymentAnomalyEntity {
  id: string; // UUID
  orderId?: string | null;
  paymentAttemptId?: string | null;
  anomalyType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rawPayload: any;
  detectedAt: string;
}

export interface PayUInitiationParams {
  key: string;
  txnid: string;
  amount: string; // Formatted to 2 decimal places e.g. "999.00"
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  hash: string;
  udf1: string; // payment_attempt_id (UUID)
  udf2: string; // order_id (UUID)
  udf3?: string;
  udf4?: string;
  udf5?: string;
}
