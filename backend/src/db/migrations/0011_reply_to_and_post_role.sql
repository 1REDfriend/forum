ALTER TABLE "forums" ADD COLUMN "post_role_min" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reply_to_post_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_reply_to_post_id_posts_id_fk" FOREIGN KEY ("reply_to_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_reply_to_post_id_idx" ON "posts" USING btree ("reply_to_post_id");
