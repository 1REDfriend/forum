ALTER TABLE "posts" DROP CONSTRAINT "posts_thread_id_threads_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "threads" DROP CONSTRAINT "threads_author_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "threads" DROP CONSTRAINT "threads_forum_id_forums_id_fk";
--> statement-breakpoint
ALTER TABLE "forums" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "forums" ADD CONSTRAINT "forums_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_forum_id_forums_id_fk" FOREIGN KEY ("forum_id") REFERENCES "public"."forums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forums_created_by_idx" ON "forums" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "posts_thread_id_idx" ON "posts" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "threads_forum_id_idx" ON "threads" USING btree ("forum_id");--> statement-breakpoint
CREATE INDEX "threads_author_id_idx" ON "threads" USING btree ("author_id");