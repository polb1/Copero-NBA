import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// ============================================
// EXISTING TABLES (from migrations/0001_init.sql)
// ============================================

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  nickname: text('nickname'),
  country: text('country'),
});

export const careers = sqliteTable('careers', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull(),
  seed: integer('seed').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
  legacyScore: integer('legacy_score').notNull().default(0),
  titles: integer('titles').notNull().default(0),
  tier: text('tier'),
  payload: text('payload'),
}, (table) => [
  index('idx_careers_player').on(table.playerId),
  index('idx_careers_score').on(table.legacyScore),
]);

export const dailyResults = sqliteTable('daily_results', {
  day: text('day').notNull(),
  playerId: text('player_id').notNull(),
  goalId: text('goal_id').notNull().default(''),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  progressA: integer('progress_a').notNull().default(0),
  progressB: integer('progress_b').notNull().default(0),
  legacyScore: integer('legacy_score').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
}, (table) => [
  uniqueIndex('pk_daily_results').on(table.day, table.playerId),
  index('idx_daily_day').on(table.day, table.legacyScore),
]);

export const dailyStreaks = sqliteTable('daily_streaks', {
  playerId: text('player_id').primaryKey(),
  streak: integer('streak').notNull().default(0),
  best: integer('best').notNull().default(0),
  lastDay: text('last_day').notNull().default(''),
}, (table) => [
  index('idx_streaks_best').on(table.best),
]);

export const shares = sqliteTable('shares', {
  id: text('id').primaryKey(),
  careerId: text('career_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  views: integer('views').notNull().default(0),
}, (table) => [
  index('idx_shares_career').on(table.careerId),
]);

// ============================================
// BETTER AUTH TABLES (exact schema from auth generate)
// ============================================

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
  // Guest migration fields
  guestId: text('guest_id').unique(),
  guestDataClaimed: integer('guest_data_claimed', { mode: 'boolean' }).default(false).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => [
  index('session_userId_idx').on(table.userId),
]);

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('account_userId_idx').on(table.userId),
  uniqueIndex('idx_account_provider_account').on(table.providerId, table.accountId),
]);

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('verification_identifier_idx').on(table.identifier),
  uniqueIndex('idx_verification_identifier_value').on(table.identifier, table.value),
]);

// ============================================
// GUEST MIGRATION TABLE
// ============================================

export const guest = sqliteTable('guest', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .$onUpdate(() => new Date())
    .notNull(),
  claimedBy: text('claimed_by').references(() => user.id),
  claimedAt: integer('claimed_at', { mode: 'timestamp_ms' }),
}, (table) => [
  index('idx_guest_claimed_by').on(table.claimedBy),
]);

// ============================================
// RELATIONS (for Better Auth)
// ============================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export type Career = typeof careers.$inferSelect;
export type NewCareer = typeof careers.$inferInsert;

export type DailyResult = typeof dailyResults.$inferSelect;
export type NewDailyResult = typeof dailyResults.$inferInsert;

export type DailyStreak = typeof dailyStreaks.$inferSelect;
export type NewDailyStreak = typeof dailyStreaks.$inferInsert;

export type Share = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Guest = typeof guest.$inferSelect;
export type NewGuest = typeof guest.$inferInsert;