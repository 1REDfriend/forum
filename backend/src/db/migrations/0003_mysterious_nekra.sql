ALTER TABLE "users" ADD COLUMN "tier" text DEFAULT 'Bronze' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banner" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;