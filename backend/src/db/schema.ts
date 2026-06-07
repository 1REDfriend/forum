import { pgTable, text, timestamp, integer, boolean, index, unique, date, type AnyPgColumn } from "drizzle-orm/pg-core";
import { newId } from "./ids.js";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(newId),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id"),
  authProvider: text("auth_provider").notNull().default("local"), // 'local' or 'google'
  role: text("role").notNull().default("user"), // 'user' or 'admin' — set by admin
  tier: text("tier").notNull().default("wanderer"), // journey tier — auto-computed, monotonic; admin can override
  score: integer("score").notNull().default(0), // latest computed score snapshot
  lastLoginDate: date("last_login_date"), // for login streak
  loginStreak: integer("login_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  tierUpdatedAt: timestamp("tier_updated_at"),
  avatar: text("avatar"),
  banner: text("banner"), // profile cover image URL
  bio: text("bio"), // profile description
  isBanned: boolean("is_banned").notNull().default(false),
  bannedAt: timestamp("banned_at"),
  banReason: text("ban_reason"),
  bannedBy: text("banned_by").references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("users_is_banned_idx").on(table.isBanned),
]));

export const forums = pgTable("forums", {
  id: text("id").primaryKey().$defaultFn(newId),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("forums_created_by_idx").on(table.createdBy),
]));

export const threads = pgTable("threads", {
  id: text("id").primaryKey().$defaultFn(newId),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  forumId: text("forum_id").references(() => forums.id, { onDelete: 'cascade' }).notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ([
  index("threads_forum_id_idx").on(table.forumId),
  index("threads_author_id_idx").on(table.authorId),
]));

export const posts = pgTable("posts", {
  id: text("id").primaryKey().$defaultFn(newId),
  content: text("content").notNull(),
  threadId: text("thread_id").references(() => threads.id, { onDelete: 'cascade' }).notNull(),
  authorId: text("author_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ([
  index("posts_thread_id_idx").on(table.threadId),
  index("posts_author_id_idx").on(table.authorId),
]));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(newId),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("prt_user_id_idx").on(table.userId),
  index("prt_token_idx").on(table.token),
]));

export const refreshTokens = pgTable("refresh_tokens", {
  id: text("id").primaryKey().$defaultFn(newId),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text("token_hash").notNull().unique(), // sha256 of the raw token
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"), // set on rotation or logout
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("rt_user_id_idx").on(table.userId),
  index("rt_token_hash_idx").on(table.tokenHash),
]));

export const likes = pgTable("likes", {
  id: text("id").primaryKey().$defaultFn(newId),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  threadId: text("thread_id").references(() => threads.id, { onDelete: 'cascade' }),
  postId: text("post_id").references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("likes_user_id_idx").on(table.userId),
  index("likes_thread_id_idx").on(table.threadId),
  index("likes_post_id_idx").on(table.postId),
  unique("likes_user_thread_unique").on(table.userId, table.threadId),
  unique("likes_user_post_unique").on(table.userId, table.postId),
]));

export const reports = pgTable("reports", {
  id: text("id").primaryKey().$defaultFn(newId),
  reporterId: text("reporter_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetType: text("target_type").notNull(), // 'thread' | 'post' | 'user'
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'reviewed' | 'dismissed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("reports_target_idx").on(table.targetType, table.targetId),
  index("reports_status_idx").on(table.status),
  // one report per reporter per target
  unique("reports_reporter_target_unique").on(table.reporterId, table.targetType, table.targetId),
]));

export const userBadges = pgTable("user_badges", {
  id: text("id").primaryKey().$defaultFn(newId),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  badgeKey: text("badge_key").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
}, (table) => ([
  index("user_badges_user_idx").on(table.userId),
  unique("user_badges_user_key_unique").on(table.userId, table.badgeKey),
]));
