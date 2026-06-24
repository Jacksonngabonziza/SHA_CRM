// ── Activity Log ──────────────────────────────────────────────────────────────
export type ActivityAction =
  | 'login' | 'logout'
  | 'create' | 'update' | 'delete'
  | 'status_change' | 'send' | 'reset_pin'
  | 'mark_paid' | 'approve' | 'reject'

export interface ActivityLog {
  id: number
  user: number | null
  user_name: string
  user_role: string
  action: ActivityAction
  resource_type: string
  resource_id: number | null
  resource_label: string
  description: string
  ip_address: string | null
  created_at: string
}

export interface ActivitySummary {
  total: number
  today: number
  by_action: { action: string; count: number }[]
  by_resource: { resource_type: string; count: number }[]
  top_users: { user_id: number; user_name: string; user_role: string; count: number }[]
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: 'admin' | 'sales' | 'field_agent'
  phone: string
  avatar: string | null
  is_active: boolean
  created_at: string
}

export interface AuthTokens {
  access: string
  refresh: string
  user: User
}

// ── Agents ───────────────────────────────────────────────────────────────────
export interface CommissionTier {
  id: number
  label: string
  min_amount: number
  max_amount: number | null
  rate: number
  rate_pct: number
}

export interface AgentProfile {
  zone: string
  target_clients_per_month: number
  commission_rate: number | null
  uses_tiers: boolean
}

export interface AgentCommission {
  id: number
  quote: number
  quote_ref: string
  client_name: string
  quote_total: number
  amount_rwf: number
  is_paid: boolean
  paid_at: string | null
  notes: string
  created_at: string
}

export interface Agent {
  id: number
  username: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  is_active: boolean
  created_at: string
  agent_profile: AgentProfile | null
  total_clients: number
  clients_this_month: number
  clients_won: number
  total_quotes: number
  total_commission_rwf: number
  pending_commission_rwf: number
  last_login_at: string | null
}

export interface AgentStats {
  id: number
  full_name: string
  phone: string
  zone: string
  target_clients_per_month: number
  commission_rate: number | null
  uses_tiers: boolean
  tiers: CommissionTier[]
  clients_this_month: number
  total_clients: number
  clients_won: number
  total_commission_rwf: number
  pending_commission_rwf: number
}

// ── Products ──────────────────────────────────────────────────────────────────
export type ProductCategory = 'panel' | 'battery' | 'inverter' | 'generator' | 'accessory'

export interface Product {
  id: number
  name: string
  category: ProductCategory
  category_display: string
  brand: string
  model: string
  description: string
  image: string | null
  price_rwf: number
  price_usd: number | null
  wattage_wp: number | null
  panel_efficiency: number | null
  capacity_kwh: number | null
  voltage_v: number | null
  battery_cycles: number | null
  power_kw: number | null
  inverter_type: string
  phase: 'single' | 'three' | ''
  is_all_in_one: boolean
  min_panel_wp: number | null
  max_panel_wp: number | null
  max_pv_input_w: number | null
  builtin_inverter_kw: number | null
  builtin_capacity_kwh: number | null
  warranty_years: number
  linear_warranty_years: number | null
  in_stock: boolean
  stock_quantity: number
  is_active: boolean
  display_spec: string
  created_at: string
}

export interface ProductsByCategory {
  panels: Product[]
  batteries: Product[]
  inverters: Product[]
  generators: Product[]
  accessories: Product[]
}

// ── Clients ───────────────────────────────────────────────────────────────────
export type ClientStatus = 'new' | 'quoted' | 'followup' | 'won' | 'lost'
export type ClientType = 'residential' | 'school' | 'clinic' | 'business' | 'community'

export interface Client {
  id: number
  name: string
  phone: string
  email: string
  location: string
  address: string
  client_type: ClientType
  client_type_display: string
  is_offgrid: boolean
  monthly_bill_rwf: number | null
  monthly_kwh: number | null
  status: ClientStatus
  status_display: string
  source: string
  notes: string
  followup_date: string | null
  assigned_to: number | null
  assigned_to_name: string | null
  source_agent: number | null
  source_agent_name: string | null
  total_quotes: number
  created_at: string
  updated_at: string
}

export interface ClientNote {
  id: number
  note: string
  created_by: number
  created_by_name: string
  created_at: string
}

// ── Appliances ────────────────────────────────────────────────────────────────
export interface Appliance {
  id?: number
  name: string
  quantity: number
  wattage: number
  hours_per_day: number
  daily_kwh?: number
}

// ── Quotes ────────────────────────────────────────────────────────────────────
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
export type QuoteType = 'installation' | 'product_order'

export interface QuoteLineItem {
  id?: number
  product: number | null
  product_detail?: Product | null
  description: string
  quantity: number
  unit_price: number
  total?: number
}

export interface Quote {
  id: number
  ref_number: string
  quote_type: QuoteType
  quote_type_display: string
  client: number
  client_detail: Client
  client_name?: string
  client_phone?: string
  appliances: Appliance[]
  line_items: QuoteLineItem[]
  total_daily_kwh: number
  design_daily_kwh: number
  system_size_kwp: number
  max_load_kw: number
  num_panels: number
  num_inverters: number
  num_batteries: number
  backup_hours: number
  peak_sun_hours: number
  panel: number | null
  battery: number | null
  inverter: number | null
  generator: number | null
  panel_detail: Product | null
  battery_detail: Product | null
  inverter_detail: Product | null
  generator_detail: Product | null
  panels_cost: number
  battery_cost: number
  inverter_cost: number
  generator_cost: number
  is_all_in_one_mode: boolean
  accessories_cost: number
  installation_cost: number
  total_price_rwf: number
  annual_savings_rwf: number
  payback_years: number
  grid_tariff_rwf_kwh: number
  status: QuoteStatus
  status_display: string
  valid_days: number
  valid_until: string
  notes: string
  internal_notes: string
  share_token: string
  share_url: string
  created_by: number
  created_by_name: string
  feedback: ClientFeedback[]
  created_at: string
  updated_at: string
}

// ── Calculate result ──────────────────────────────────────────────────────────
export interface CalculateResult {
  appliances: Appliance[]
  total_daily_kwh: number
  design_daily_kwh: number
  max_load_kw: number
  system_size_kwp: number
  num_panels: number
  backup_hours: number
  peak_sun_hours: number
  required_battery_kwh: number
  num_batteries: number
  num_inverters: number
  panel: ProductSummary | null
  inverter: ProductSummary | null
  battery: ProductSummary | null
  generator: ProductSummary | null
  is_all_in_one_mode: boolean
  validation_warnings: string[]
  total_pv_w: number
  panels_cost: number
  battery_cost: number
  inverter_cost: number
  generator_cost: number
  accessories_cost: number
  installation_cost: number
  total_price_rwf: number
  annual_savings_rwf: number
  payback_years: number
  grid_tariff_rwf_kwh: number
}

export interface ProductSummary {
  id: number
  name: string
  brand: string
  model: string
  category: string
  display_spec: string
  price_rwf: number
  warranty_years: number
  wattage_wp: number | null
  capacity_kwh: number | null
  power_kw: number | null
  is_all_in_one: boolean
  max_pv_input_w: number | null
  max_panel_wp: number | null
  builtin_inverter_kw: number | null
  builtin_capacity_kwh: number | null
}

// ── Feedback ──────────────────────────────────────────────────────────────────
export interface ClientFeedback {
  id: number
  message: string
  status: 'pending' | 'approved' | 'rejected'
  status_display: string
  client_name: string
  created_at: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  clients: {
    total: number
    new_this_month: number
    new_last_month: number
    by_status: Record<ClientStatus, number>
  }
  quotes: {
    total: number
    this_month: number
    won: number
    conversion_rate: number
    by_status: Record<QuoteStatus, number>
  }
  orders: {
    total: number
    this_month: number
    won: number
  }
  revenue: {
    total: number
    this_month: number
    last_month: number
  }
  followups: {
    overdue: number
    overdue_count: number
    today_count: number
    due: Client[]
  }
  products: {
    total: number
    out_of_stock: number
  }
  alerts: {
    expiring_quotes: Quote[]
    expiring_count: number
  }
  recent_quotes: Quote[]
  recent_clients: Client[]
  monthly_revenue: { month: string; revenue: number; quotes: number }[]
}

// ── Installations ─────────────────────────────────────────────────────────────
export type InstallationStatus = 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

export interface InstallationLog {
  id: number
  note: string
  logged_by: number | null
  logged_by_name: string
  created_at: string
}

export interface Installation {
  id: number
  quote: number
  client: number
  client_name: string
  quote_ref: string
  total_price_rwf: number
  assigned_team: number[]
  status: InstallationStatus
  status_display: string
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  commissioning_done: boolean
  client_training_done: boolean
  handover_notes: string
  issues_noted: string
  logs: InstallationLog[]
  created_by: number | null
  created_at: string
  updated_at: string
}

// ── Payments ──────────────────────────────────────────────────────────────────
export type PaymentType = 'deposit' | 'partial' | 'final' | 'full'
export type PaymentMethod = 'cash' | 'momo' | 'bank' | 'cheque'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed'

export interface Payment {
  id: number
  quote: number
  quote_ref: string
  quote_total: number
  client: number
  client_name: string
  amount_rwf: number
  payment_type: PaymentType
  payment_type_display: string
  payment_method: PaymentMethod
  payment_method_display: string
  status: PaymentStatus
  status_display: string
  reference: string
  payment_date: string
  notes: string
  balance_due: number
  recorded_by: number | null
  created_at: string
}

export interface PaymentSummary {
  quote_ref: string
  total_price: number
  total_paid: number
  balance_due: number
  payments: Payment[]
  is_fully_paid: boolean
}

// ── Surveys ───────────────────────────────────────────────────────────────────
export type RoofType = 'flat' | 'pitched' | 'metal' | 'tile' | 'concrete'
export type ShadingLevel = 'none' | 'partial' | 'heavy'
export type GridStatus = 'connected' | 'offgrid' | 'unstable'
export type Feasibility = 'feasible' | 'conditional' | 'not_feasible'

export interface SiteSurvey {
  id: number
  client: number
  client_name: string
  quote: number | null
  surveyed_by: number | null
  surveyed_by_name: string
  address: string
  gps_latitude: number | null
  gps_longitude: number | null
  roof_type: RoofType | ''
  roof_area_m2: number | null
  roof_orientation: string
  shading_level: ShadingLevel
  shading_notes: string
  grid_status: GridStatus
  existing_system_notes: string
  main_breaker_amps: number | null
  three_phase: boolean
  db_board_condition: string
  scaffolding_needed: boolean
  installation_risks: string
  feasibility: Feasibility
  feasibility_display: string
  recommended_system_kw: number | null
  surveyor_notes: string
  photo_roof: string | null
  photo_db_board: string | null
  photo_site: string | null
  surveyed_at: string | null
  created_at: string
  updated_at: string
}

// ── Warranty ──────────────────────────────────────────────────────────────────
export type WarrantyClaimStatus = 'open' | 'in_review' | 'resolved' | 'rejected'
export type WarrantyClaimPriority = 'low' | 'medium' | 'high'

export interface WarrantyClaim {
  id: number
  installation: number
  installation_ref: string
  client_name: string
  title: string
  description: string
  status: WarrantyClaimStatus
  status_display: string
  priority: WarrantyClaimPriority
  priority_display: string
  raised_by: number | null
  raised_by_name: string
  resolved_by: number | null
  resolved_by_name: string
  resolution_notes: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// ── Referrals ─────────────────────────────────────────────────────────────────
export type ReferralStatus = 'pending' | 'converted' | 'lost'

export interface Referral {
  id: number
  referrer: number
  referrer_name: string
  referred: number
  referred_name: string
  status: ReferralStatus
  status_display: string
  notes: string
  reward_given: boolean
  reward_notes: string
  created_by: number | null
  created_at: string
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface MonthlyReportSummary {
  new_clients: number
  quotes_created: number
  quotes_won: number
  revenue_collected: number
  installations_completed: number
  avg_system_size: number
}

export interface SalesBreakdown {
  name: string
  role: string
  new_clients: number
  quotes_sent: number
  quotes_won: number
  revenue: number
}

export interface MonthlyReport {
  period: string
  summary: MonthlyReportSummary
  by_client_type: { client_type: ClientType; count: number }[]
  top_packages: { system_size_kwp: number; count: number }[]
  sales_breakdown: SalesBreakdown[]
}

export interface RevenueMonth {
  month: string
  won: number
  revenue_quoted: number
  revenue_collected: number
}

export interface RevenueReport {
  months: RevenueMonth[]
}

// ── Company Settings ──────────────────────────────────────────────────────────
export interface CompanySettings {
  company_name: string
  company_tin: string
  company_phone: string
  company_email: string
  company_website: string
  company_tagline: string
  company_address: string
  bank_name: string
  bank_account: string
  momo_number: string
  momo_name: string
  payment_instructions: string
  system_lifespan: string
  quote_terms: string
  grid_tariff_rwf_kwh: number
  installation_pct: number
  accessories_pct: number
  safety_margin_pct: number
  default_peak_sun_hours: number
  default_backup_hours: number
  default_valid_days: number
  sales_commission_pct: number
  sales_commission_name: string
  role_permissions: Record<string, string[]>
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export type ExpenseCategory =
  | 'rent' | 'utilities' | 'fuel' | 'materials'
  | 'salaries' | 'contractor' | 'marketing' | 'transport' | 'maintenance' | 'other'

export type ExpenseFrequency = 'monthly' | 'quarterly' | 'annual'

export interface Expense {
  id: number
  description: string
  category: ExpenseCategory
  category_display: string
  amount_rwf: number
  date: string
  quote: number | null
  quote_ref: string | null
  notes: string
  recorded_by: number | null
  recorded_by_name: string
  created_at: string
}

export interface RecurringExpense {
  id: number
  name: string
  category: ExpenseCategory
  category_display: string
  amount_rwf: number
  frequency: ExpenseFrequency
  frequency_display: string
  next_due_date: string
  is_active: boolean
  is_overdue: boolean
  notes: string
  created_by: number | null
  created_at: string
}

export interface ExpenseSummary {
  year: number
  month: number | null
  grand_total: number
  by_category: { category: string; total: number }[]
  overdue_recurring: number
}

// ── Purchases ─────────────────────────────────────────────────────────────────
export interface Supplier {
  id: number
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
  notes: string
  created_at: string
}

export interface PurchaseOrderItem {
  id: number
  purchase_order: number
  product: number
  product_name: string
  product_brand: string
  product_model: string
  quantity: number
  unit_cost_rwf: number
  line_total: number
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export interface PurchaseOrder {
  id: number
  supplier: number
  supplier_name: string
  ref_number: string
  status: PurchaseOrderStatus
  status_display: string
  order_date: string
  received_date: string | null
  total_cost_rwf: number
  notes: string
  items: PurchaseOrderItem[]
  created_by: number | null
  created_by_name: string
  created_at: string
  updated_at: string
}

// ── Financial Report ──────────────────────────────────────────────────────────
export interface FinancialCategoryBreakdown {
  category: string
  label: string
  total: number
}

export interface FinancialMonthTrend {
  month: string
  revenue: number
  cash: number
  expenses: number
  cogs: number
  net_profit: number
}

export interface FinancialReport {
  period: { from: string; to: string }
  revenue: {
    installation: number
    orders: number
    gross: number
    install_count: number
    order_count: number
  }
  cash: { collected: number; outstanding: number }
  cogs: number
  expenses: { total: number; by_category: FinancialCategoryBreakdown[] }
  profit: {
    gross: number
    gross_margin_pct: number
    net: number
    net_margin_pct: number
  }
  monthly_trend: FinancialMonthTrend[]
}

// ── WhatsApp CRM ──────────────────────────────────────────────────────────────
export type WAStatus = 'bot' | 'human' | 'transferred' | 'resolved'
export type WALang = 'en' | 'rw' | 'fr'
export type WADirection = 'inbound' | 'outbound'
export type WAMsgStatus = 'sent' | 'delivered' | 'read' | 'failed'
export type WAMsgType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'other'

export interface WAMessage {
  id: number
  wa_message_id: string | null
  direction: WADirection
  message_type: WAMsgType
  body: string
  sent_by: number | null
  sent_by_name: string | null
  status: WAMsgStatus
  timestamp: string
}

export interface WAConversation {
  id: number
  wa_id: string
  display_name: string
  status: WAStatus
  language: WALang
  bot_step: number
  unread_count: number
  last_message_at: string | null
  created_at: string
  client: number | null
  client_name: string | null
  assigned_to: number | null
  assigned_to_name: string | null
  last_message_preview: string
}

export interface WAConversationDetail extends WAConversation {
  messages: WAMessage[]
  bot_data: Record<string, unknown>
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
