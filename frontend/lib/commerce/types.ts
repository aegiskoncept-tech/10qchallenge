// ==============================================================================
// 10Q CHALLENGE LMS — FEATURE 11: COMMERCE CORE TYPES
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

export type RefundStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'REJECTED';

export type InvoiceStatus =
  | 'ISSUED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED';

export interface InvoiceEntity {
  id: string; // UUID
  invoiceNumber: string; // e.g. 10Q-INV-2026-00001
  orderId: string;
  paymentId: string;
  userId: number;
  billingFullName: string;
  billingEmail: string;
  billingPhone?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingStateCode: string;
  billingPostalCode?: string | null;
  billingCountryCode: string;
  currency: string;
  originalAmount: number;
  discountAmount: number;
  couponCode?: string | null;
  finalAmount: number;
  gatewayName: string;
  gatewayPaymentId: string;
  merchantTxnId: string;
  status: InvoiceStatus;
  issuedAt: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  order?: OrderEntity;
  items?: OrderItemEntity[];
  refunds?: RefundEntity[];
}

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

export interface OrderItemEntity {
  id: string; // UUID
  orderId: string;
  productType: 'COURSE';
  productId: string;
  productTitleSnapshot: string;
  quantity: number;
  unitPrice: number;
  taxRateSnapshot: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
  createdAt: string;
}

export interface OrderEntity {
  id: string; // UUID
  orderNumber: string;
  userId: number; // Linked to SQLite User ID
  courseId: string; // Course ID from courses.json
  currency: string;
  originalAmount: number; // in INR (two decimal precision)
  discountAmount: number;
  netPayableAmount: number;
  taxInclusiveAmount: number;
  taxAmount: number;
  couponId?: string | null;
  couponCode?: string | null;
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
  expiresAt?: string | null;
  completedAt?: string | null;
  items?: OrderItemEntity[];
  payments?: PaymentEntity[];
  refunds?: RefundEntity[];
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
  paymentAttemptId?: string | null;
  gatewayName: 'PAYU' | 'INTERNAL_FREE_GRANT' | 'LEGACY';
  gatewayPaymentId: string;
  amount: number;
  currency: 'INR';
  settlementStatus: SettlementStatus;
  settledAt: string;
  metadata?: any;
}

export interface RefundEntity {
  id: string; // UUID
  orderId: string;
  paymentId?: string | null;
  refundReference: string;
  amount: number;
  currency: 'INR';
  reason: string;
  status: RefundStatus;
  gatewayRefundId?: string | null;
  initiatedBy: number;
  initiatedAt: string;
  processedAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  isSimulated?: boolean;
  isGatewayConfirmed?: boolean;
  orderNumber?: string;
  billingFullName?: string;
  billingEmail?: string;
}

export interface GatewaySettlementEntity {
  id: string; // UUID
  gateway: string;
  settlementReference: string;
  settlementDate: string;
  grossAmount: number;
  refundAmount: number;
  gatewayFee: number;
  taxOnFee: number;
  netSettlementAmount: number;
  currency: 'INR';
  settlementStatus: 'PENDING' | 'RECONCILED' | 'DISCREPANCY';
  sourceReference?: string | null;
  metadata?: any;
  reconciledBy?: number | null;
  reconciledAt?: string | null;
  createdAt: string;
}

export interface PaymentEventEntity {
  id: string; // UUID
  orderId?: string | null;
  paymentAttemptId?: string | null;
  paymentId?: string | null;
  eventType: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  source: string;
  payload?: any;
  createdAt: string;
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
