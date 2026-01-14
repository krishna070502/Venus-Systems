/**
 * Poultry Retail Types
 * ====================
 * TypeScript types for the PoultryRetail-Core module
 */

// ============ Enums ============

export type BirdType = 'BROILER' | 'PARENT_CULL'
export type InventoryType = 'LIVE' | 'SKIN' | 'SKINLESS'
export type SettlementStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED'
export type VarianceType = 'POSITIVE' | 'NEGATIVE' | 'ZERO'
export type VarianceLogStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEDUCTED'
export type PurchaseStatus = 'DRAFT' | 'COMMITTED' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CREDIT'
export type SaleType = 'POS' | 'BULK'
export type StaffGrade = 'A_PLUS' | 'A' | 'B' | 'C' | 'D' | 'E'
export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

// ============ Supplier ============

export interface Supplier {
    id: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
    gst_number: string | null
    pan_number: string | null
    status: SupplierStatus
    notes: string | null
    created_at: string
    updated_at: string
}

export interface SupplierCreate {
    name: string
    phone?: string
    email?: string
    address?: string
    gst_number?: string
    pan_number?: string
    notes?: string
}

export interface SupplierUpdate extends Partial<SupplierCreate> {
    status?: SupplierStatus
}

// ============ Purchase ============

export interface Purchase {
    id: string
    store_id: number
    supplier_id: string
    bird_type: BirdType
    bird_count: number
    total_weight: number
    price_per_kg: number
    total_amount: number
    status: PurchaseStatus
    vehicle_number: string | null
    driver_name: string | null
    notes: string | null
    created_by: string
    committed_by: string | null
    committed_at: string | null
    created_at: string
    updated_at: string
    supplier_name?: string
    supplier_contact?: string
    supplier?: Supplier
}

export interface PurchaseCreate {
    store_id: number
    supplier_id: string
    bird_type: BirdType
    bird_count: number
    total_weight: number
    price_per_kg: number
    vehicle_number?: string
    driver_name?: string
    notes?: string
}

export interface PurchaseCommit {
    actual_weight?: number
    notes?: string
}

// ============ Inventory ============

export interface Stock {
    store_id: number
    bird_type: BirdType
    inventory_type: InventoryType
    quantity: number
}

export interface StockMatrix {
    store_id: number
    as_of: string
    BROILER: {
        [key in InventoryType]: number
    } & { LIVE_COUNT?: number }
    PARENT_CULL: {
        [key in InventoryType]: number
    } & { LIVE_COUNT?: number }
}

export interface InventoryLedgerEntry {
    id: string
    store_id: number
    bird_type: BirdType
    inventory_type: InventoryType
    quantity_change: number
    bird_count_change: number
    reason_code: string
    ref_id: string | null
    ref_type: string | null
    user_id: string
    notes: string | null
    created_at: string
}

export interface StockMovement {
    store_id: number
    date: string
    bird_type: BirdType
    inventory_type: InventoryType
    opening_stock: number
    purchases: number
    processing_in: number
    processing_out: number
    sales: number
    adjustments: number
    closing_stock: number
}

export interface InventoryAdjust {
    store_id: number
    bird_type: BirdType
    inventory_type: InventoryType
    quantity_change: number
    reason_code: string
    notes?: string
}

// ============ Processing ============

export interface ProcessingEntry {
    id: string
    store_id: number
    input_bird_type: BirdType
    output_inventory_type: InventoryType
    input_weight: number
    output_weight: number
    wastage_weight: number
    wastage_percentage: number
    processed_by: string
    notes?: string
    created_at: string
}

export interface ProcessingCreate {
    store_id: number
    processing_date?: string
    input_bird_type: BirdType
    output_inventory_type: InventoryType
    input_weight: number
    idempotency_key?: string
}

export interface YieldCalculation {
    input_weight: number
    expected_output: number
    wastage_percentage: number
    wastage_weight: number
}

export interface WastageConfig {
    id: string
    bird_type: BirdType
    output_type: InventoryType
    wastage_percentage: number
    updated_by: string | null
    updated_at: string
}

// ============ SKU ============

export interface SKU {
    id: string
    name: string
    code: string
    description: string | null
    bird_type: BirdType
    inventory_type: InventoryType
    unit: string
    is_active: boolean
    display_order: number
    created_at: string
    updated_at: string
}

export interface SKUCreate {
    name: string
    code: string
    description?: string
    bird_type: BirdType
    inventory_type: InventoryType
    unit?: string
    display_order?: number
}

export interface SKUUpdate extends Partial<SKUCreate> {
    is_active?: boolean
}

export interface StorePrice {
    id: string
    store_id: number
    sku_id: string
    price: number
    effective_date: string
    created_at: string
}

export interface SKUWithPrice extends SKU {
    current_price: number | null
    effective_date: string | null
}

export interface StorePriceSet {
    store_id: number
    sku_id: string
    price: number
    effective_date?: string
}

// ============ Sales ============

export interface SaleItem {
    id: string
    sale_id: string
    sku_id: string
    sku_name?: string
    sku_code?: string
    weight: number
    price_snapshot: number
    total: number
    sku?: SKU
}

export interface Sale {
    id: string
    store_id: number
    receipt_number: string
    sale_type: SaleType
    payment_method: PaymentMethod
    customer_id?: string
    customer_name: string | null
    customer_phone: string | null
    payment_status?: 'PENDING' | 'PARTIAL' | 'PAID'
    subtotal: number
    discount_amount: number
    total_amount: number
    notes: string | null
    cashier_id: string
    created_at: string
    items?: SaleItem[]
}

export interface SaleItemCreate {
    sku_id: string
    weight: number
    price_snapshot: number
}

export interface SaleCreate {
    store_id: number
    sale_type: SaleType
    payment_method: PaymentMethod
    customer_id?: string
    customer_name?: string
    customer_phone?: string
    items: SaleItemCreate[]
    discount_amount?: number
    notes?: string
    idempotency_key?: string
}

export interface SalesSummary {
    date: string
    store_id: number
    total_sales: number
    total_amount: number
    cash_amount: number
    upi_amount: number
    card_amount: number
    total_weight: number
}

// ============ Settlement ============

export interface DeclaredStock {
    [key: string]: {  // bird_type
        [key: string]: number  // inventory_type -> quantity
    }
}

export interface Settlement {
    id: string
    store_id: number
    settlement_date: string
    declared_cash: number
    declared_upi: number
    declared_card: number
    declared_bank: number
    declared_stock: any
    expected_sales: any
    expected_stock: any
    calculated_variance: any
    expense_amount: number
    expense_notes: string | null
    status: SettlementStatus
    submitted_by: string | null
    submitted_at: string | null
    approved_by: string | null
    approved_at: string | null
    locked_at: string | null
    created_at: string
    updated_at: string
}

export interface SettlementCreate {
    store_id: number
    settlement_date: string
}

export interface SettlementSubmit {
    declared_cash: number
    declared_upi: number
    declared_stock: DeclaredStock
}

// ============ Variance ============

export interface VarianceLog {
    id: string
    settlement_id: string
    bird_type: BirdType
    inventory_type: InventoryType
    variance_type: VarianceType
    expected_weight: number
    declared_weight: number
    variance_weight: number
    status: VarianceLogStatus
    resolved_by: string | null
    resolved_at: string | null
    submitted_by_name?: string
    resolved_by_name?: string
    notes: string | null
    created_at: string
}

export interface VarianceApprove {
    reason: string
}

// ============ Staff Points ============

export interface StaffPointEntry {
    id: string
    user_id: string
    store_id: number
    points_change: number
    reason: string
    reason_details: string | null
    reason_code: string
    ref_id: string | null
    ref_type: string | null
    effective_date: string
    created_by: string | null
    created_at: string
}

export interface StaffPointSummary {
    user_id: string
    store_id: number | null
    total_points: number
    period_start: string | null
    period_end: string | null
}

export interface StaffPointAdd {
    user_id: string
    store_id: number
    points: number
    reason_code: string
    notes?: string
}

export interface StaffPointBreakdownItem {
    reason_code: string
    description: string
    points: number
    count: number
}

export interface StaffVarianceSummary {
    positive_kg: number
    negative_kg: number
    count: number
}

export interface StaffPerformanceBreakdown {
    user_id: string
    total_points: number
    total_weight_handled: number
    normalized_score: number
    grade: StaffGrade
    points_breakdown: StaffPointBreakdownItem[]
    variance_summary: StaffVarianceSummary
}

export interface LeaderboardEntry {
    user_id: string
    user_email: string
    user_name: string
    total_points: number
    grade?: StaffGrade
    rank: number
    store_id?: number
    store_name?: string
}

// ============ Grading ============

export interface StaffMonthlyPerformance {
    id: string
    user_id: string
    user_name?: string
    store_id: number
    year: number
    month: number
    total_points: number
    total_weight_handled: number
    normalized_score: number
    grade: StaffGrade
    bonus_amount: number | null
    penalty_amount: number | null
    is_locked: boolean
    created_at: string
}

export interface GradeThresholds {
    A_PLUS_min: number
    A_min: number
    B_min: number
    C_min: number
    D_min: number
}

export interface BonusRates {
    A_PLUS: number
    A: number
    B: number
    C: number
    D: number
    E: number
}

export interface PenaltyRates {
    C: number
    D: number
    E: number
}

export interface OverallGradingConfig {
    thresholds: GradeThresholds
    bonus_rates: BonusRates
    penalty_rates: PenaltyRates
    bonus_cap: number
    penalty_cap: number
}

export interface GradingConfig {
    id: string
    config_key: string
    config_value: number
    config_type: 'GRADE_THRESHOLD' | 'BONUS_RATE' | 'PENALTY_RATE' | 'SYSTEM'
    description: string | null
    store_id: number | null
}

export interface WastageConfig {
    id: string
    bird_type: BirdType
    target_inventory_type: InventoryType
    percentage: number
    effective_date: string
    is_active: boolean
    created_at: string
}

export interface WastageConfigCreate {
    bird_type: BirdType
    target_inventory_type: InventoryType
    percentage: number
    effective_date: string
    is_active: boolean
}

export interface ReasonCode {
    code: string
    description: string
    points_value: number
    is_per_kg: boolean
    category: 'SETTLEMENT' | 'DISCIPLINE' | 'FRAUD' | 'MANUAL'
    is_configurable: boolean
    created_at: string
}

export interface PerformanceGenerate {
    store_id: number
    year: number
    month: number
}

export interface PerformanceLock {
    store_id: number
    year: number
    month: number
}

// ============ API Response Types ============

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    page: number
    page_size: number
}

export interface ApiError {
    detail: string
    code?: string
}

// ============ Customer ============

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

export interface Customer {
    id: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
    gstin: string | null
    credit_limit: number
    status: CustomerStatus
    notes: string | null
    created_at: string
    updated_at: string
    outstanding_balance?: number  // Computed from ledger
}

export interface CustomerCreate {
    name: string
    phone?: string
    email?: string
    address?: string
    gstin?: string
    credit_limit?: number
    notes?: string
}

export interface CustomerUpdate extends Partial<CustomerCreate> {
    status?: CustomerStatus
}

// ============ Receipt (Customer Payment) ============

export type ReceiptPaymentMethod = 'CASH' | 'BANK' | 'UPI' | 'CHEQUE' | 'OTHER'

export interface Receipt {
    id: string
    receipt_number: string
    sale_id: string | null
    customer_id: string
    amount: number
    payment_method: ReceiptPaymentMethod
    reference_number: string | null
    receipt_date: string
    notes: string | null
    store_id: number | null
    created_at: string
    customer_name?: string  // Joined field
    sale_invoice?: string   // Joined field
}

export interface ReceiptCreate {
    sale_id?: string
    customer_id: string
    amount: number
    payment_method: ReceiptPaymentMethod
    reference_number?: string
    receipt_date?: string
    notes?: string
}

// ============ Supplier Payment ============

export interface SupplierPayment {
    id: string
    payment_number: string
    supplier_id: string
    purchase_id: string | null
    amount: number
    payment_method: ReceiptPaymentMethod
    reference_number: string | null
    payment_date: string
    notes: string | null
    store_id: number | null
    created_at: string
    supplier_name?: string  // Joined field
}

export interface SupplierPaymentCreate {
    supplier_id: string
    purchase_id?: string
    amount: number
    payment_method: ReceiptPaymentMethod
    reference_number?: string
    payment_date?: string
    notes?: string
}

// ============ Ledger ============

export interface FinancialLedgerEntry {
    id: string
    store_id: number | null
    entity_type: 'CUSTOMER' | 'SUPPLIER'
    entity_id: string
    transaction_type: 'SALE' | 'RECEIPT' | 'PURCHASE' | 'SUPPLIER_PAYMENT'
    debit: number
    credit: number
    ref_table: string | null
    ref_id: string | null
    notes: string | null
    created_at: string
}

export interface SupplierLedgerSummary {
    entity_id: string
    entity_name: string
    phone: string | null
    total_debit: number
    total_credit: number
    outstanding: number
    total_purchases: number
    total_payments: number
}

export interface CustomerLedgerSummary {
    entity_id: string
    entity_name: string
    phone: string | null
    credit_limit: number
    total_debit: number
    total_credit: number
    outstanding: number
    total_sales: number
    total_receipts: number
}

// ============ Fraud Monitoring ============

export type RiskLevel = 'HIGH' | 'MEDIUM'

export interface FraudFlagUser extends StaffMonthlyPerformance {
    user_email: string
    user_name: string
    risk_level: RiskLevel
    has_fraud_flag: boolean
    is_suspended: boolean
}

export interface FraudFlagsResponse {
    period: string
    at_risk_count: number
    users: FraudFlagUser[]
}
