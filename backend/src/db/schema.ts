import { pgTable, text, timestamp, integer, boolean, index, unique, primaryKey, date, type AnyPgColumn } from "drizzle-orm/pg-core";
import { newId } from "./ids.js";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(newId),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id"),
  authProvider: text("auth_provider").notNull().default("local"), // 'local' or 'google'
  role: text("role").notNull().default("user"), // 'user' | 'manager' | 'admin' — set by admin
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
  // null | 'user' | 'manager' | 'admin' — minimum role allowed to post/thread (Phase F)
  postRoleMin: text("post_role_min"),
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
  // Q&A: when true, posts can be marked accepted answer
  isQa: boolean("is_qa").notNull().default(false),
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
  replyToPostId: text("reply_to_post_id").references((): AnyPgColumn => posts.id, { onDelete: 'set null' }),
  isAccepted: boolean("is_accepted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ([
  index("posts_thread_id_idx").on(table.threadId),
  index("posts_author_id_idx").on(table.authorId),
  index("posts_reply_to_post_id_idx").on(table.replyToPostId),
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

// Badge definitions (admin-managed catalog). Auto-award rules for built-in keys
// still live in code (domain/badges.ts); rows here are the editable metadata.
export const badges = pgTable("badges", {
  key: text("key").primaryKey(), // stable identifier, e.g. 'first_post'
  label: text("label").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userBadges = pgTable("user_badges", {
  id: text("id").primaryKey().$defaultFn(newId),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  badgeKey: text("badge_key").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
}, (table) => ([
  index("user_badges_user_idx").on(table.userId),
  unique("user_badges_user_key_unique").on(table.userId, table.badgeKey),
]));

// Per-user last-read cursor for threads (Phase C).
export const threadReads = pgTable("thread_reads", {
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  threadId: text("thread_id").references(() => threads.id, { onDelete: 'cascade' }).notNull(),
  lastReadAt: timestamp("last_read_at").notNull(),
}, (table) => ([
  primaryKey({ columns: [table.userId, table.threadId], name: 'thread_reads_pk' }),
  index("thread_reads_thread_id_idx").on(table.threadId),
]));

// In-app notifications (Phase B). Primary content writes must not fail if insert fails.
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(newId),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(), // thread_reply | post_reply | badge_awarded | mention | …
  actorId: text("actor_id").references(() => users.id, { onDelete: 'set null' }),
  entityType: text("entity_type"), // thread | post | badge | …
  entityId: text("entity_id"),
  threadId: text("thread_id"),
  payload: text("payload"), // JSON string
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("notifications_user_created_idx").on(table.userId, table.createdAt),
  index("notifications_user_unread_idx").on(table.userId),
]));

// Tracks who started each CDN multipart upload, so /part, /complete, /abort
// can reject requests from a user who obtained someone else's upload_id/object_key.
export const attachmentUploads = pgTable("attachment_uploads", {
  id: text("id").primaryKey().$defaultFn(newId),
  uploadId: text("upload_id").notNull(),
  objectKey: text("object_key").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  unique("attachment_uploads_upload_id_unique").on(table.uploadId),
  index("attachment_uploads_user_id_idx").on(table.userId),
]));

// ─── Phase G + remaining E/F ─────────────────────────────────────────────────

export const tags = pgTable("tags", {
  id: text("id").primaryKey().$defaultFn(newId),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const threadTags = pgTable("thread_tags", {
  threadId: text("thread_id").references(() => threads.id, { onDelete: 'cascade' }).notNull(),
  tagId: text("tag_id").references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ([
  primaryKey({ columns: [table.threadId, table.tagId], name: 'thread_tags_pk' }),
  index("thread_tags_tag_id_idx").on(table.tagId),
]));

export const forumModerators = pgTable("forum_moderators", {
  forumId: text("forum_id").references(() => forums.id, { onDelete: 'cascade' }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.forumId, table.userId], name: 'forum_moderators_pk' }),
  index("forum_moderators_user_id_idx").on(table.userId),
]));

export const threadWatches = pgTable("thread_watches", {
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  threadId: text("thread_id").references(() => threads.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  primaryKey({ columns: [table.userId, table.threadId], name: 'thread_watches_pk' }),
  index("thread_watches_thread_id_idx").on(table.threadId),
]));

/** Emoji reactions on threads or posts (in addition to classic likes). */
export const reactions = pgTable("reactions", {
  id: text("id").primaryKey().$defaultFn(newId),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emoji: text("emoji").notNull(), // e.g. '❤️' '🔥' '😂' '🎉' '👀'
  threadId: text("thread_id").references(() => threads.id, { onDelete: 'cascade' }),
  postId: text("post_id").references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("reactions_thread_id_idx").on(table.threadId),
  index("reactions_post_id_idx").on(table.postId),
  unique("reactions_user_thread_emoji_unique").on(table.userId, table.threadId, table.emoji),
  unique("reactions_user_post_emoji_unique").on(table.userId, table.postId, table.emoji),
]));

export const polls = pgTable("polls", {
  id: text("id").primaryKey().$defaultFn(newId),
  threadId: text("thread_id").references(() => threads.id, { onDelete: 'cascade' }).notNull().unique(),
  question: text("question").notNull(),
  closesAt: timestamp("closes_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollOptions = pgTable("poll_options", {
  id: text("id").primaryKey().$defaultFn(newId),
  pollId: text("poll_id").references(() => polls.id, { onDelete: 'cascade' }).notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => ([
  index("poll_options_poll_id_idx").on(table.pollId),
]));

export const pollVotes = pgTable("poll_votes", {
  id: text("id").primaryKey().$defaultFn(newId),
  pollId: text("poll_id").references(() => polls.id, { onDelete: 'cascade' }).notNull(),
  optionId: text("option_id").references(() => pollOptions.id, { onDelete: 'cascade' }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  unique("poll_votes_poll_user_unique").on(table.pollId, table.userId),
  index("poll_votes_option_id_idx").on(table.optionId),
]));

/** Direct messages: one conversation between exactly two users (sorted pair). */
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(newId),
  userAId: text("user_a_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  userBId: text("user_b_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  unique("conversations_pair_unique").on(table.userAId, table.userBId),
  index("conversations_user_a_idx").on(table.userAId),
  index("conversations_user_b_idx").on(table.userBId),
]));

export const directMessages = pgTable("direct_messages", {
  id: text("id").primaryKey().$defaultFn(newId),
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: text("sender_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("direct_messages_conversation_id_idx").on(table.conversationId),
  index("direct_messages_sender_id_idx").on(table.senderId),
]));

/** Optional calendar events (community events). */
export const events = pgTable("events", {
  id: text("id").primaryKey().$defaultFn(newId),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  createdBy: text("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("events_starts_at_idx").on(table.startsAt),
]));

