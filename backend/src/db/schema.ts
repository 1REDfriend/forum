import { pgTable, serial, text, timestamp, integer, boolean, index, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id"),
  authProvider: text("auth_provider").notNull().default("local"), // 'local' or 'google'
  role: text("role").notNull().default("user"), // 'user' or 'admin'
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forums = pgTable("forums", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("forums_created_by_idx").on(table.createdBy),
]));

export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  forumId: integer("forum_id").references(() => forums.id, { onDelete: 'cascade' }).notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ([
  index("threads_forum_id_idx").on(table.forumId),
  index("threads_author_id_idx").on(table.authorId),
]));

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  threadId: integer("thread_id").references(() => threads.id, { onDelete: 'cascade' }).notNull(),
  authorId: integer("author_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ([
  index("posts_thread_id_idx").on(table.threadId),
  index("posts_author_id_idx").on(table.authorId),
]));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("prt_user_id_idx").on(table.userId),
  index("prt_token_idx").on(table.token),
]));

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  threadId: integer("thread_id").references(() => threads.id, { onDelete: 'cascade' }),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("likes_user_id_idx").on(table.userId),
  index("likes_thread_id_idx").on(table.threadId),
  index("likes_post_id_idx").on(table.postId),
  unique("likes_user_thread_unique").on(table.userId, table.threadId),
  unique("likes_user_post_unique").on(table.userId, table.postId),
]));
