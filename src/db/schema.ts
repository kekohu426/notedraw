import { boolean, integer, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	role: text('role'),
	banned: boolean('banned'),
	banReason: text('ban_reason'),
	banExpires: timestamp('ban_expires'),
	customerId: text('customer_id'),
}, (table) => ({
	userIdIdx: index("user_id_idx").on(table.id),
	userCustomerIdIdx: index("user_customer_id_idx").on(table.customerId),
	userRoleIdx: index("user_role_idx").on(table.role),
}));

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	impersonatedBy: text('impersonated_by')
}, (table) => ({
	sessionTokenIdx: index("session_token_idx").on(table.token),
	sessionUserIdIdx: index("session_user_id_idx").on(table.userId),
}));

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
}, (table) => ({
	accountUserIdIdx: index("account_user_id_idx").on(table.userId),
	accountAccountIdIdx: index("account_account_id_idx").on(table.accountId),
	accountProviderIdIdx: index("account_provider_id_idx").on(table.providerId),
}));

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const payment = pgTable("payment", {
	id: text("id").primaryKey(),
	priceId: text('price_id').notNull(),
	type: text('type').notNull(),
	scene: text('scene'), // payment scene: 'lifetime', 'credit', 'subscription'
	interval: text('interval'),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	customerId: text('customer_id').notNull(),
	subscriptionId: text('subscription_id'),
	sessionId: text('session_id'),
	invoiceId: text('invoice_id').unique(), // unique constraint for avoiding duplicate processing
	status: text('status').notNull(),
	paid: boolean('paid').notNull().default(false), // indicates whether payment is completed (set in invoice.paid event)
	periodStart: timestamp('period_start'),
	periodEnd: timestamp('period_end'),
	cancelAtPeriodEnd: boolean('cancel_at_period_end'),
	trialStart: timestamp('trial_start'),
	trialEnd: timestamp('trial_end'),
	provider: text('provider').notNull().default('stripe'), // payment provider: 'stripe' | 'creem'
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
	paymentTypeIdx: index("payment_type_idx").on(table.type),
	paymentSceneIdx: index("payment_scene_idx").on(table.scene),
	paymentPriceIdIdx: index("payment_price_id_idx").on(table.priceId),
	paymentUserIdIdx: index("payment_user_id_idx").on(table.userId),
	paymentCustomerIdIdx: index("payment_customer_id_idx").on(table.customerId),
	paymentStatusIdx: index("payment_status_idx").on(table.status),
	paymentPaidIdx: index("payment_paid_idx").on(table.paid),
	paymentSubscriptionIdIdx: index("payment_subscription_id_idx").on(table.subscriptionId),
	paymentSessionIdIdx: index("payment_session_id_idx").on(table.sessionId),
	paymentInvoiceIdIdx: index("payment_invoice_id_idx").on(table.invoiceId),
}));

export const userCredit = pgTable("user_credit", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	currentCredits: integer("current_credits").notNull().default(0),
	lastRefreshAt: timestamp("last_refresh_at"), // deprecated
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	userCreditUserIdIdx: index("user_credit_user_id_idx").on(table.userId),
}));

export const creditTransaction = pgTable("credit_transaction", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	type: text("type").notNull(),
	description: text("description"),
	amount: integer("amount").notNull(),
	remainingAmount: integer("remaining_amount"),
	paymentId: text("payment_id"), // field name is paymentId, but actually it's invoiceId
	expirationDate: timestamp("expiration_date"),
	expirationDateProcessedAt: timestamp("expiration_date_processed_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	creditTransactionUserIdIdx: index("credit_transaction_user_id_idx").on(table.userId),
	creditTransactionTypeIdx: index("credit_transaction_type_idx").on(table.type),
}));

// ============================================================
// NoteDraw 数据表
// ============================================================

/**
 * 笔记项目表 - 存储用户的视觉笔记生成项目
 */
export const noteProject = pgTable("note_project", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	title: text("title"),
	inputText: text("input_text").notNull(),
	language: text("language").notNull().default("en"), // en | zh
	visualStyle: text("visual_style").notNull().default("sketch"), // sketch | business | cute | minimal | chalkboard
	generateMode: text("generate_mode").notNull().default("detailed"), // compact | detailed
	signature: text("signature").default("娇姐手绘整理"), // 署名（显示在图片右下角）
	status: text("status").notNull().default("draft"), // draft | processing | completed | failed
	errorMessage: text("error_message"),
	// 广场相关字段
	isPublic: boolean("is_public").notNull().default(false), // 是否公开到广场
	isFeatured: boolean("is_featured").notNull().default(false), // 是否精选
	slug: text("slug").unique(), // URL slug
	description: text("description"), // 简短描述
	tags: text("tags"), // 标签，逗号分隔
	likes: integer("likes").notNull().default(0), // 点赞数
	views: integer("views").notNull().default(0), // 浏览数
	publishedAt: timestamp("published_at"), // 发布时间
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	noteProjectUserIdIdx: index("note_project_user_id_idx").on(table.userId),
	noteProjectStatusIdx: index("note_project_status_idx").on(table.status),
	noteProjectCreatedAtIdx: index("note_project_created_at_idx").on(table.createdAt),
	noteProjectPublicIdx: index("note_project_public_idx").on(table.isPublic),
	noteProjectStyleIdx: index("note_project_style_idx").on(table.visualStyle),
}));

/**
 * 笔记卡片表 - 存储每张生成的视觉笔记卡片
 */
export const noteCard = pgTable("note_card", {
	id: text("id").primaryKey(),
	projectId: text("project_id").notNull().references(() => noteProject.id, { onDelete: 'cascade' }),
	order: integer("order").notNull().default(0),
	originalText: text("original_text"),
	structure: text("structure"), // JSON string of LeftBrainData
	prompt: text("prompt"),
	imageUrl: text("image_url"),
	status: text("status").notNull().default("pending"), // pending | generating | completed | failed
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	noteCardProjectIdIdx: index("note_card_project_id_idx").on(table.projectId),
	noteCardStatusIdx: index("note_card_status_idx").on(table.status),
	noteCardOrderIdx: index("note_card_order_idx").on(table.order),
}));

// ============================================================
// 兑换码系统
// ============================================================

/**
 * 兑换码表 - 用于内测期间的积分/会员激活
 */
export const redemptionCode = pgTable("redemption_code", {
	id: text("id").primaryKey(),
	code: text("code").notNull().unique(), // 兑换码（如：NOTEDRAW-XXXX-XXXX）
	type: text("type").notNull(), // 'credits' | 'membership' | 'trial'
	value: integer("value").notNull(), // 积分数量 或 会员天数
	description: text("description"), // 兑换码描述（内部备注）
	maxUses: integer("max_uses").notNull().default(1), // 最大使用次数
	usedCount: integer("used_count").notNull().default(0), // 已使用次数
	isActive: boolean("is_active").notNull().default(true), // 是否启用
	expiresAt: timestamp("expires_at"), // 过期时间（null = 永不过期）
	createdBy: text("created_by"), // 创建者 ID
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	redemptionCodeIdx: index("redemption_code_idx").on(table.code),
	redemptionCodeTypeIdx: index("redemption_code_type_idx").on(table.type),
	redemptionCodeActiveIdx: index("redemption_code_active_idx").on(table.isActive),
}));

/**
 * 兑换记录表 - 记录用户的兑换历史
 */
export const redemptionRecord = pgTable("redemption_record", {
	id: text("id").primaryKey(),
	codeId: text("code_id").notNull().references(() => redemptionCode.id),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
	code: text("code").notNull(), // 冗余存储兑换码
	type: text("type").notNull(), // 冗余存储类型
	value: integer("value").notNull(), // 冗余存储值
	redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
}, (table) => ({
	redemptionRecordCodeIdIdx: index("redemption_record_code_id_idx").on(table.codeId),
	redemptionRecordUserIdIdx: index("redemption_record_user_id_idx").on(table.userId),
}));

// ============================================================
// 系统配置表
// ============================================================

/**
 * 系统配置表 - 存储动态配置项
 */
export const systemConfig = pgTable("system_config", {
	id: text("id").primaryKey(),
	category: text("category").notNull(), // 配置分类: 'credits' | 'features' | 'limits'
	key: text("key").notNull(), // 配置键
	value: text("value").notNull(), // 配置值
	description: text("description"), // 配置描述
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
	systemConfigCategoryKeyIdx: index("system_config_category_key_idx").on(table.category, table.key),
}));
