import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Attachments table for storing file references (receipts, invoices, etc.)
 */
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entryId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileSize: int("fileSize").notNull(), // in bytes
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

/**
 * Audit log table for tracking changes to entries
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entryId").notNull(),
  userId: int("userId").notNull(),
  action: mysqlEnum("action", ["create", "update", "delete"]).notNull(),
  fieldChanged: varchar("fieldChanged", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

export const notificationsSent = mysqlTable("notifications_sent", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("item_id").notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  notificationType: varchar("notification_type", { length: 50 }).notNull(), // 'budget_exceeded'
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  message: text("message"),
});

export type NotificationSent = typeof notificationsSent.$inferSelect;
export type InsertNotificationSent = typeof notificationsSent.$inferInsert;

/**
 * User settings table for storing personalized configurations
 */
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  
  // Color settings
  colorTabs: varchar("color_tabs", { length: 20 }).default("#3b82f6"),
  colorButtons: varchar("color_buttons", { length: 20 }).default("#3b82f6"),
  colorText: varchar("color_text", { length: 20 }).default("#ffffff"),
  colorBackground: varchar("color_background", { length: 20 }).default("#0f172a"),
  
  // Typography settings
  fontSize: int("font_size").default(16), // in pixels
  fontFamily: varchar("font_family", { length: 100 }).default("Inter"),
  
  // Chart settings
  chartType: mysqlEnum("chart_type", ["pie", "bar", "doughnut"]).default("pie"),
  chartShowLabels: boolean("chart_show_labels").default(true),
  chartShowValues: boolean("chart_show_values").default(true),

  /**
   * Método de orçamento selecionado pelo usuário. "categories" usa o orçamento padrão
   * por categorias individuais. "groups" agrupa categorias em fixos, variáveis e não mensais.
   * "50-30-20" aplica a regra 50/30/20 (needs/wants/savings). "envelopes" trata cada
   * categoria como um envelope de gastos. A definição é feita na página de configurações.
   */
  budgetMethod: mysqlEnum("budget_method", ["categories", "groups", "50-30-20", "envelopes"]).default("categories"),
  
  // Backup settings
  autoBackupEnabled: boolean("auto_backup_enabled").default(false),
  autoBackupFrequency: mysqlEnum("auto_backup_frequency", ["daily", "weekly", "monthly"]).default("weekly"),
  lastBackupAt: timestamp("last_backup_at"),
  /**
   * Two-factor authentication settings. When enabled, the user must provide
   * a verification code sent via email/WhatsApp each time they sign in. The
   * current code hash and expiration are stored temporarily. Codes are
   * generated on demand and cleared after verification or expiry.
   */
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorCodeHash: varchar("two_factor_code_hash", { length: 128 }),
  twoFactorExpiresAt: timestamp("two_factor_expires_at"),
  /**
   * Shared secret used for time‑based one‑time passwords (TOTP) when 2FA is
   * configured via authenticator apps (e.g., Google Authenticator). The secret
   * is stored encrypted using AES‑256‑GCM via the encryption helper. When this
   * field is non‑null and twoFactorEnabled is true, the server will verify
   * provided TOTP codes instead of sending SMS/email codes. It should be
   * treated as highly sensitive.
   */
  twoFactorSecret: varchar("two_factor_secret", { length: 255 }),

  /**
   * Flag indicating whether the user has enrolled at least one WebAuthn credential.
   * When true, the login flow will prompt for biometric authentication via WebAuthn.
   */
  webAuthnEnabled: boolean("web_authn_enabled").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// TODO: Add your tables here

/**
 * Categories table for organizing income/expenses (Entradas, Alunos, Investimentos, etc)
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["income", "expense", "investment"]).notNull(),
  color: varchar("color", { length: 20 }).notNull().default("blue"),
  /**
   * Nome do ícone (ex.: 'shopping-cart', 'home') proveniente da biblioteca lucide-react.
   */
  icon: varchar("icon", { length: 50 }),
  /**
   * URL de uma imagem associada à categoria. Pode ser uma foto ou ilustração decorativa.
   */
  imageUrl: varchar("imageUrl", { length: 500 }),

  /**
   * Grupo de orçamento ao qual esta categoria pertence. Pode ser usado para métodos
   * de orçamento alternativos (como grupos fixos/variáveis/não mensais ou regra 50/30/20).
   * Valores possíveis: 'fixed', 'variable', 'nonMonthly', 'needs', 'wants', 'savings'.
   */
  budgetGroup: mysqlEnum("budget_group", ["fixed", "variable", "nonMonthly", "needs", "wants", "savings"]).default("variable"),
  orderIndex: int("orderIndex").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Itens dentro de cada categoria (Salário Líquido, Célvora, Parcela Lote, etc)
 */
export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull().references(() => categories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  customCategory: varchar("customCategory", { length: 100 }),
  orderIndex: int("orderIndex").notNull().default(0),
  inactiveFromMonth: int("inactiveFromMonth"),
  inactiveFromYear: int("inactiveFromYear"),
  /**
   * Dia de vencimento para lembretes de contas. 1-31.
   * Quando definido, o sistema pode gerar alertas alguns dias antes do vencimento.
   */
  dueDay: int("dueDay"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

/**
 * Lançamentos mensais - valores planejados e reais para cada pessoa
 */
export const entries = mysqlTable("entries", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull().references(() => items.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  person: mysqlEnum("person", ["licius", "marielly"]).notNull(),
  plannedValue: int("plannedValue").notNull().default(0), // em centavos
  actualValue: int("actualValue").notNull().default(0), // em centavos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),

  /**
   * Comentários ou notas associadas a este lançamento. Pode ser usado para justificar um gasto
   * ou deixar uma observação sobre o lançamento. Null indica ausência de nota.
   */
  notes: text("notes"),

  /**
   * Flag que indica se foi solicitado revisão deste lançamento pelo outro parceiro. Quando true,
   * o sistema deve notificar o parceiro correspondente para revisar este lançamento. O valor
   * padrão é false.
   */
  reviewRequested: boolean("reviewRequested").default(false),
});

export type Entry = typeof entries.$inferSelect;
export type InsertEntry = typeof entries.$inferInsert;

/**
 * Investment transactions table. Stores details of buy and sell operations
 * imported via the Open Finance integration. These records are separate from
 * monthly budget entries and allow building reports on investment performance.
 */
export const investmentTransactions = mysqlTable("investment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  /**
   * Identifier of the user (from the `users` table) who owns this transaction.
   */
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * External identifier for the transaction from the provider (e.g. Belvo).
   */
  externalId: varchar("external_id", { length: 100 }).notNull(),
  /**
   * Identifier of the Open Finance link used to retrieve this transaction. Not
   * necessarily a foreign key but allows tracking which consent/link was used.
   */
  linkId: varchar("link_id", { length: 100 }),
  /**
   * ISO date of the transaction (YYYY-MM-DD). Use string to preserve exact date.
   */
  date: varchar("date", { length: 20 }).notNull(),
  /**
   * Ticker or name of the financial instrument (e.g. stock or fund). May be null
   * if unavailable.
   */
  instrument: varchar("instrument", { length: 50 }),
  /**
   * Quantity of shares/units purchased or sold. Fractional quantities allowed.
   */
  quantity: varchar("quantity", { length: 50 }),
  /**
   * Gross amount of the transaction in the account currency (positive for buys,
   * negative for sells). Stored as string to preserve decimals.
   */
  grossValue: varchar("gross_value", { length: 50 }),
  /**
   * Net amount after fees and taxes in the account currency.
   */
  netValue: varchar("net_value", { length: 50 }),
  /**
   * Operation type (e.g. 'buy', 'sell', 'bonus', 'income').
   */
  operationType: varchar("operation_type", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type InvestmentTransaction = typeof investmentTransactions.$inferSelect;
export type InsertInvestmentTransaction = typeof investmentTransactions.$inferInsert;

/**
 * WebAuthn credentials table. Stores public keys and metadata associated with
 * registered WebAuthn authenticators for biometric authentication. Each
 * credential belongs to a user and can be used for passwordless login or as
 * an additional factor.
 */
export const webauthnCredentials = mysqlTable("webauthn_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Base64URL encoded credential ID returned by the browser during registration.
   */
  credentialId: varchar("credential_id", { length: 200 }).notNull(),
  /**
   * The user's public key encoded as Base64URL. Used by the server to verify
   * signatures during authentication.
   */
  publicKey: text("public_key").notNull(),
  /**
   * Number of successful authentications. WebAuthn clients increment the
   * signature counter to help detect credential cloning. Stored as integer.
   */
  signCount: int("sign_count").notNull().default(0),
  /**
   * Human‑readable name for the authenticator (e.g. 'iPhone Face ID'). Optional.
   */
  label: varchar("label", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebAuthnCredential = typeof webauthnCredentials.$inferInsert;

/**
 * Classification history table. Stores manual categorizations by users to
 * enable learning and improve automatic classification over time. When a
 * user manually changes the category of a transaction (or confirms an AI
 * suggestion), this action is recorded here. The AI classifier can then
 * query this table to find patterns and improve future suggestions.
 */
export const classificationHistory = mysqlTable("classification_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Original description of the transaction (normalized to lowercase for matching)
   */
  description: varchar("description", { length: 500 }).notNull(),
  /**
   * Transaction amount in cents. Used to help classify similar amounts.
   */
  amount: int("amount").notNull(),
  /**
   * Category ID that was manually selected or confirmed by the user
   */
  categoryId: int("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  /**
   * Confidence score (0-100). Higher scores indicate more certain classifications.
   * Starts at 50 for manual selections, increases with repeated confirmations.
   */
  confidence: int("confidence").notNull().default(50),
  /**
   * Number of times this exact description→category mapping was confirmed
   */
  confirmations: int("confirmations").notNull().default(1),
  /**
   * Source of classification: 'manual' (user selected), 'confirmed' (user confirmed AI suggestion)
   */
  source: mysqlEnum("source", ["manual", "confirmed"]).notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ClassificationHistory = typeof classificationHistory.$inferSelect;
export type InsertClassificationHistory = typeof classificationHistory.$inferInsert;

/**
 * Push subscription table. Stores Web Push API subscriptions for each user's device.
 * Allows sending notifications to multiple devices (phone, tablet, desktop).
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Push subscription endpoint (unique per device)
   */
  endpoint: varchar("endpoint", { length: 500 }).notNull().unique(),
  /**
   * p256dh key for encryption
   */
  p256dh: varchar("p256dh", { length: 200 }).notNull(),
  /**
   * Auth secret for encryption
   */
  auth: varchar("auth", { length: 200 }).notNull(),
  /**
   * User agent / device info for identification
   */
  userAgent: varchar("user_agent", { length: 500 }),
  /**
   * Whether this subscription is still active
   */
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Push notifications log. Tracks all push notifications sent to users.
 */
export const pushNotifications = mysqlTable("push_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: int("subscription_id").references(() => pushSubscriptions.id, { onDelete: "set null" }),
  /**
   * Notification title
   */
  title: varchar("title", { length: 200 }).notNull(),
  /**
   * Notification body/message
   */
  body: varchar("body", { length: 500 }).notNull(),
  /**
   * Type of notification for filtering and analytics
   */
  type: mysqlEnum("type", [
    "budget_alert",      // Budget exceeded
    "due_date_reminder", // Payment due soon
    "monthly_summary",   // Monthly report
    "goal_achieved",     // Goal reached
    "anomaly_detected",  // Unusual spending
    "backup_complete",   // Backup finished
    "general"           // General notification
  ]).notNull().default("general"),
  /**
   * Optional data payload (JSON string)
   */
  data: text("data"),
  /**
   * Delivery status
   */
  status: mysqlEnum("status", ["sent", "failed", "read"]).notNull().default("sent"),
  /**
   * Error message if delivery failed
   */
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});

export type PushNotification = typeof pushNotifications.$inferSelect;
export type InsertPushNotification = typeof pushNotifications.$inferInsert;

/**
 * Financial goals table. Allows users to set and track savings goals.
 * Goals can be individual or shared between family members.
 */
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Goal name/description
   */
  name: varchar("name", { length: 200 }).notNull(),
  /**
   * Goal description (optional)
   */
  description: text("description"),
  /**
   * Target amount in cents
   */
  targetAmount: int("target_amount").notNull(),
  /**
   * Current saved amount in cents
   */
  currentAmount: int("current_amount").notNull().default(0),
  /**
   * Target date to achieve the goal
   */
  targetDate: timestamp("target_date"),
  /**
   * Goal category/type
   */
  category: mysqlEnum("category", [
    "emergency",      // Fundo de emergência
    "travel",         // Viagem
    "purchase",       // Compra grande
    "education",      // Educação
    "retirement",     // Aposentadoria
    "investment",     // Investimento
    "debt",          // Pagamento de dívida
    "other"          // Outros
  ]).notNull().default("other"),
  /**
   * Priority level
   */
  priority: mysqlEnum("priority", ["low", "medium", "high"]).notNull().default("medium"),
  /**
   * Whether this goal is shared with partner
   */
  isShared: boolean("is_shared").notNull().default(false),
  /**
   * Icon emoji for the goal
   */
  icon: varchar("icon", { length: 10 }).default("🎯"),
  /**
   * Goal status
   */
  status: mysqlEnum("status", ["active", "completed", "paused", "cancelled"]).notNull().default("active"),
  /**
   * Completion date (when status becomes completed)
   */
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

/**
 * Goal contributions/transactions table. Tracks deposits and withdrawals.
 */
export const goalTransactions = mysqlTable("goal_transactions", {
  id: int("id").autoincrement().primaryKey(),
  goalId: int("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Transaction amount in cents (positive for deposits, negative for withdrawals)
   */
  amount: int("amount").notNull(),
  /**
   * Transaction type
   */
  type: mysqlEnum("type", ["deposit", "withdrawal", "adjustment"]).notNull(),
  /**
   * Optional note/description
   */
  note: text("note"),
  /**
   * Related entry ID if this contribution came from a budget entry
   */
  entryId: int("entry_id"),
  /**
   * Transaction date
   */
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GoalTransaction = typeof goalTransactions.$inferSelect;
export type InsertGoalTransaction = typeof goalTransactions.$inferInsert;

/**
 * Goal milestones. Break down large goals into smaller achievements.
 */
export const goalMilestones = mysqlTable("goal_milestones", {
  id: int("id").autoincrement().primaryKey(),
  goalId: int("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  /**
   * Milestone name
   */
  name: varchar("name", { length: 200 }).notNull(),
  /**
   * Target amount for this milestone
   */
  targetAmount: int("target_amount").notNull(),
  /**
   * Order/sequence of this milestone
   */
  order: int("order").notNull().default(0),
  /**
   * Whether milestone is completed
   */
  isCompleted: boolean("is_completed").notNull().default(false),
  /**
   * Completion date
   */
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GoalMilestone = typeof goalMilestones.$inferSelect;
export type InsertGoalMilestone = typeof goalMilestones.$inferInsert;

/**
 * Bank connections (links) - Stores connected bank accounts via Belvo
 */
export const bankConnections = mysqlTable("bank_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Belvo link ID
   */
  linkId: varchar("link_id", { length: 200 }).notNull().unique(),
  /**
   * Institution name (e.g., "Banco do Brasil", "Nubank")
   */
  institutionName: varchar("institution_name", { length: 200 }).notNull(),
  /**
   * Institution code/type from Belvo
   */
  institutionCode: varchar("institution_code", { length: 100 }),
  /**
   * Account type
   */
  accountType: mysqlEnum("account_type", [
    "checking",        // Conta corrente
    "savings",         // Poupança
    "credit_card",     // Cartão de crédito
    "investment",      // Investimentos
    "loan"            // Empréstimo
  ]).notNull(),
  /**
   * Account holder name
   */
  accountHolder: varchar("account_holder", { length: 200 }),
  /**
   * Last 4 digits of account/card number
   */
  lastFour: varchar("last_four", { length: 4 }),
  /**
   * Connection status
   */
  status: mysqlEnum("status", ["active", "expired", "error", "disconnected"]).notNull().default("active"),
  /**
   * Last successful sync date
   */
  lastSyncAt: timestamp("last_sync_at"),
  /**
   * Auto-sync enabled
   */
  autoSync: boolean("auto_sync").notNull().default(true),
  /**
   * Sync frequency in hours (24 = daily, 168 = weekly)
   */
  syncFrequency: int("sync_frequency").notNull().default(24),
  /**
   * Error message if connection failed
   */
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type BankConnection = typeof bankConnections.$inferSelect;
export type InsertBankConnection = typeof bankConnections.$inferInsert;

/**
 * Imported bank transactions - Raw transactions from Belvo
 */
export const importedTransactions = mysqlTable("imported_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: int("connection_id").notNull().references(() => bankConnections.id, { onDelete: "cascade" }),
  /**
   * External transaction ID from Belvo (for deduplication)
   */
  externalId: varchar("external_id", { length: 200 }).notNull(),
  /**
   * Transaction description from bank
   */
  description: text("description").notNull(),
  /**
   * Transaction amount in cents (negative for expenses, positive for income)
   */
  amount: int("amount").notNull(),
  /**
   * Transaction date
   */
  transactionDate: timestamp("transaction_date").notNull(),
  /**
   * Transaction type from bank
   */
  transactionType: varchar("transaction_type", { length: 100 }),
  /**
   * Merchant/payee name (if available)
   */
  merchant: varchar("merchant", { length: 200 }),
  /**
   * MCC code (Merchant Category Code)
   */
  mccCode: varchar("mcc_code", { length: 10 }),
  /**
   * Category suggested by bank/Belvo
   */
  bankCategory: varchar("bank_category", { length: 100 }),
  /**
   * Processing status
   */
  status: mysqlEnum("status", [
    "pending",         // Aguardando processamento
    "matched",         // Matched com entry existente
    "imported",        // Importado como nova entry
    "ignored",         // Ignorado pelo usuário
    "duplicate"        // Duplicata detectada
  ]).notNull().default("pending"),
  /**
   * Matched entry ID (if reconciled)
   */
  matchedEntryId: int("matched_entry_id"),
  /**
   * AI suggested category ID
   */
  suggestedCategoryId: int("suggested_category_id"),
  /**
   * AI confidence score (0-100)
   */
  confidenceScore: int("confidence_score"),
  /**
   * User notes
   */
  notes: text("notes"),
  /**
   * Import batch ID (to track sync sessions)
   */
  batchId: varchar("batch_id", { length: 100 }),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export type ImportedTransaction = typeof importedTransactions.$inferSelect;
export type InsertImportedTransaction = typeof importedTransactions.$inferInsert;

/**
 * Sync history - Track all sync operations
 */
export const syncHistory = mysqlTable("sync_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: int("connection_id").notNull().references(() => bankConnections.id, { onDelete: "cascade" }),
  /**
   * Batch ID for this sync
   */
  batchId: varchar("batch_id", { length: 100 }).notNull(),
  /**
   * Date range synced
   */
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  /**
   * Number of transactions fetched
   */
  transactionsFetched: int("transactions_fetched").notNull().default(0),
  /**
   * Number of new transactions imported
   */
  transactionsImported: int("transactions_imported").notNull().default(0),
  /**
   * Number of duplicates skipped
   */
  duplicatesSkipped: int("duplicates_skipped").notNull().default(0),
  /**
   * Sync status
   */
  status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(),
  /**
   * Error message if failed
   */
  errorMessage: text("error_message"),
  /**
   * Sync duration in milliseconds
   */
  duration: int("duration"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export type SyncHistory = typeof syncHistory.$inferSelect;
export type InsertSyncHistory = typeof syncHistory.$inferInsert;

/**
 * Collaboration system tables for partner communication and approvals
 */

/**
 * Entry comments - Internal chat/discussion about specific entries
 */
export const entryComments = mysqlTable("entry_comments", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Comment text
   */
  comment: text("comment").notNull(),
  /**
   * Comment type
   */
  type: mysqlEnum("type", ["comment", "question", "approval_request", "approval", "rejection"]).notNull().default("comment"),
  /**
   * Whether partner has read this comment
   */
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EntryComment = typeof entryComments.$inferSelect;
export type InsertEntryComment = typeof entryComments.$inferInsert;

/**
 * Approval requests - Expenses above threshold need partner approval
 */
export const approvalRequests = mysqlTable("approval_requests", {
  id: int("id").autoincrement().primaryKey(),
  entryId: int("entry_id").notNull().references(() => entries.id, { onDelete: "cascade" }),
  /**
   * User who requested approval
   */
  requesterId: int("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * User who should approve
   */
  approverId: int("approver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Amount being requested (in cents)
   */
  amount: int("amount").notNull(),
  /**
   * Request reason/description
   */
  reason: text("reason"),
  /**
   * Approval status
   */
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).notNull().default("pending"),
  /**
   * Approver's response/notes
   */
  approverNotes: text("approver_notes"),
  /**
   * When the request was responded to
   */
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;

/**
 * Collaboration settings - Configure approval thresholds and notifications
 */
export const collaborationSettings = mysqlTable("collaboration_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  /**
   * Require approval for expenses above this amount (in cents)
   */
  approvalThreshold: int("approval_threshold").default(50000), // R$ 500 default
  /**
   * Whether to send WhatsApp notifications for approvals
   */
  whatsappNotifications: boolean("whatsapp_notifications").notNull().default(true),
  /**
   * Whether to send push notifications for comments
   */
  pushNotifications: boolean("push_notifications").notNull().default(true),
  /**
   * Whether to require approval for new categories/items
   */
  requireApprovalForNewItems: boolean("require_approval_for_new_items").notNull().default(false),
  /**
   * Partner user ID for approvals
   */
  partnerId: int("partner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CollaborationSettings = typeof collaborationSettings.$inferSelect;
export type InsertCollaborationSettings = typeof collaborationSettings.$inferInsert;

/**
 * Activity log - Track who did what for transparency
 */
export const collaborationActivity = mysqlTable("collaboration_activity", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /**
   * Activity type
   */
  activityType: mysqlEnum("activity_type", [
    "entry_created",
    "entry_updated", 
    "entry_deleted",
    "approval_requested",
    "approval_granted",
    "approval_rejected",
    "comment_added",
    "review_requested",
    "threshold_changed"
  ]).notNull(),
  /**
   * Related entry ID (if applicable)
   */
  entryId: int("entry_id"),
  /**
   * Related approval request ID (if applicable)
   */
  approvalId: int("approval_id"),
  /**
   * Activity description
   */
  description: text("description").notNull(),
  /**
   * Additional metadata (JSON)
   */
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CollaborationActivity = typeof collaborationActivity.$inferSelect;
export type InsertCollaborationActivity = typeof collaborationActivity.$inferInsert;

/**
 * Backups table - Store backup metadata
 */
export const backups = mysqlTable("backups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(),
  fileSize: int("file_size").notNull(), // in bytes
  type: mysqlEnum("type", ["auto", "manual"]).default("auto").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = typeof backups.$inferInsert;

/**
 * Backup schedules - User preferences for automatic backups
 */
export const backupSchedules = mysqlTable("backup_schedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]).default("weekly").notNull(),
  time: text("time").default("02:00:00").notNull(), // TIME as text
  enabled: boolean("enabled").default(true).notNull(),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type BackupSchedule = typeof backupSchedules.$inferSelect;
export type InsertBackupSchedule = typeof backupSchedules.$inferInsert;

/**
 * Backup logs - Audit trail for backup operations
 */
export const backupLogs = mysqlTable("backup_logs", {
  id: int("id").autoincrement().primaryKey(),
  backupId: int("backup_id").notNull().references(() => backups.id, { onDelete: "cascade" }),
  action: mysqlEnum("action", ["started", "completed", "failed", "restored"]).notNull(),
  message: text("message"),
  metadata: text("metadata"), // JSON as text
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BackupLog = typeof backupLogs.$inferSelect;
export type InsertBackupLog = typeof backupLogs.$inferInsert;

/**
 * Projects - Orçamentos temporários por evento/projeto
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["wedding", "renovation", "travel", "event", "other"]).default("other").notNull(),
  startDate: text("start_date").notNull(), // DATE as text
  endDate: text("end_date"), // DATE as text
  totalBudget: int("total_budget").notNull(), // cents
  status: mysqlEnum("status", ["planning", "active", "completed", "cancelled"]).default("planning").notNull(),
  color: varchar("color", { length: 20 }).default("#3b82f6"),
  icon: varchar("icon", { length: 50 }).default("briefcase"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project Categories - Categorias específicas de cada projeto
 */
export const projectCategories = mysqlTable("project_categories", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  budget: int("budget").notNull(), // cents
  color: varchar("color", { length: 20 }).default("#6b7280"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProjectCategory = typeof projectCategories.$inferSelect;
export type InsertProjectCategory = typeof projectCategories.$inferInsert;

/**
 * Project Expenses - Despesas do projeto
 */
export const projectExpenses = mysqlTable("project_expenses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  categoryId: int("category_id").references(() => projectCategories.id, { onDelete: "set null" }),
  description: varchar("description", { length: 200 }).notNull(),
  plannedValue: int("planned_value").notNull(), // cents
  actualValue: int("actual_value").default(0).notNull(), // cents
  date: text("date").notNull(), // DATE as text
  paid: boolean("paid").default(false).notNull(),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProjectExpense = typeof projectExpenses.$inferSelect;
export type InsertProjectExpense = typeof projectExpenses.$inferInsert;

/**
 * Project Milestones - Marcos/entregas do projeto
 */
export const projectMilestones = mysqlTable("project_milestones", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  dueDate: text("due_date").notNull(), // DATE as text
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = typeof projectMilestones.$inferInsert;

/**
 * Custom Alerts - Alertas personalizados com condições complexas
 */
export const customAlerts = mysqlTable("custom_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(true).notNull(),
  conditions: text("conditions").notNull(), // JSON as text
  channels: text("channels").notNull(), // JSON as text
  frequency: mysqlEnum("frequency", ["realtime", "daily", "weekly", "monthly"]).default("realtime").notNull(),
  lastTriggered: timestamp("last_triggered"),
  triggerCount: int("trigger_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CustomAlert = typeof customAlerts.$inferSelect;
export type InsertCustomAlert = typeof customAlerts.$inferInsert;

/**
 * Alert Triggers - Histórico de disparos de alertas
 */
export const alertTriggers = mysqlTable("alert_triggers", {
  id: int("id").autoincrement().primaryKey(),
  alertId: int("alert_id").notNull().references(() => customAlerts.id, { onDelete: "cascade" }),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  conditionsMet: text("conditions_met").notNull(), // JSON as text
  channelsSent: text("channels_sent").notNull(), // JSON as text
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON as text
  success: boolean("success").default(true).notNull(),
  error: text("error"),
});

export type AlertTrigger = typeof alertTriggers.$inferSelect;
export type InsertAlertTrigger = typeof alertTriggers.$inferInsert;

/**
 * Alert Templates - Templates de alertas salvos
 */
export const alertTemplates = mysqlTable("alert_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  conditions: text("conditions").notNull(), // JSON as text
  channels: text("channels").notNull(), // JSON as text
  isPublic: boolean("is_public").default(false).notNull(),
  usageCount: int("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AlertTemplate = typeof alertTemplates.$inferSelect;
export type InsertAlertTemplate = typeof alertTemplates.$inferInsert;

/**
 * Alert Channels Config - Configuração de canais de notificação
 */
export const alertChannelsConfig = mysqlTable("alert_channels_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  emailEnabled: boolean("email_enabled").default(false).notNull(),
  emailAddress: varchar("email_address", { length: 320 }),
  whatsappEnabled: boolean("whatsapp_enabled").default(false).notNull(),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  pushEnabled: boolean("push_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AlertChannelsConfig = typeof alertChannelsConfig.$inferSelect;
export type InsertAlertChannelsConfig = typeof alertChannelsConfig.$inferInsert;

/**
 * Dashboard Layouts - Layouts personalizados do dashboard
 */
export const dashboardLayouts = mysqlTable("dashboard_layouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  layout: text("layout").notNull(), // JSON as text
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type DashboardLayout = typeof dashboardLayouts.$inferSelect;
export type InsertDashboardLayout = typeof dashboardLayouts.$inferInsert;

/**
 * Dashboard Widgets - Widgets customizáveis
 */
export const dashboardWidgets = mysqlTable("dashboard_widgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }),
  config: text("config"), // JSON as text
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type InsertDashboardWidget = typeof dashboardWidgets.$inferInsert;

/**
 * Dashboard Presets - Templates de dashboard pré-configurados
 */
export const dashboardPresets = mysqlTable("dashboard_presets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  layout: text("layout").notNull(), // JSON as text
  thumbnail: varchar("thumbnail", { length: 500 }),
  category: mysqlEnum("category", ["basic", "advanced", "professional", "custom"]).default("basic").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  usageCount: int("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DashboardPreset = typeof dashboardPresets.$inferSelect;
export type InsertDashboardPreset = typeof dashboardPresets.$inferInsert;

/**
 * Currencies - Moedas disponíveis
 */
export const currencies = mysqlTable("currencies", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 3 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Currency = typeof currencies.$inferSelect;
export type InsertCurrency = typeof currencies.$inferInsert;

/**
 * Exchange Rates - Taxas de câmbio
 */
export const exchangeRates = mysqlTable("exchange_rates", {
  id: int("id").autoincrement().primaryKey(),
  fromCurrency: varchar("from_currency", { length: 3 }).notNull(),
  toCurrency: varchar("to_currency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 20, scale: 10 }).notNull(),
  date: date("date").notNull(),
  source: varchar("source", { length: 50 }).default("api").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = typeof exchangeRates.$inferInsert;

/**
 * User Currency Preferences - Preferências de moeda do usuário
 */
export const userCurrencyPreferences = mysqlTable("user_currency_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  baseCurrency: varchar("base_currency", { length: 3 }).default("BRL").notNull(),
  displayCurrencies: text("display_currencies"), // JSON as text
  autoConvert: boolean("auto_convert").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserCurrencyPreference = typeof userCurrencyPreferences.$inferSelect;
export type InsertUserCurrencyPreference = typeof userCurrencyPreferences.$inferInsert;

/**
 * GAMIFICATION SYSTEM
 */

// User Gamification - XP e Níveis
export const userGamification = mysqlTable("user_gamification", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  xp: int("xp").default(0).notNull(),
  level: int("level").default(1).notNull(),
  totalXp: int("total_xp").default(0).notNull(),
  streak: int("streak").default(0).notNull(),
  lastActivityDate: date("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserGamification = typeof userGamification.$inferSelect;
export type InsertUserGamification = typeof userGamification.$inferInsert;

// Achievements - Conquistas
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  category: varchar("category", { length: 30 }),
  xpReward: int("xp_reward").default(0).notNull(),
  tier: varchar("tier", { length: 20 }).default("bronze").notNull(),
  requirement: text("requirement"), // JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

// User Achievements - Conquistas do Usuário
export const userAchievements = mysqlTable("user_achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: int("achievement_id").notNull().references(() => achievements.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: int("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
});

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;

// Challenges - Desafios
export const challenges = mysqlTable("challenges", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 30 }),
  target: text("target"), // JSON
  xpReward: int("xp_reward").default(0).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;

// User Challenges - Progresso nos Desafios
export const userChallenges = mysqlTable("user_challenges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  challengeId: int("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
  progress: int("progress").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
});

export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertUserChallenge = typeof userChallenges.$inferInsert;

// XP Transactions - Histórico de XP
export const xpTransactions = mysqlTable("xp_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: int("amount").notNull(),
  reason: varchar("reason", { length: 100 }),
  source: varchar("source", { length: 50 }),
  sourceId: int("source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type XpTransaction = typeof xpTransactions.$inferSelect;
export type InsertXpTransaction = typeof xpTransactions.$inferInsert;