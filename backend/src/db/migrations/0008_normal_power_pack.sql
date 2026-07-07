CREATE TABLE "attachment_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"object_key" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attachment_uploads_upload_id_unique" UNIQUE("upload_id")
);
--> statement-breakpoint
ALTER TABLE "attachment_uploads" ADD CONSTRAINT "attachment_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_uploads_user_id_idx" ON "attachment_uploads" USING btree ("user_id");