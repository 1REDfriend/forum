CREATE TABLE "user_crypto_keys" (
	"user_id" text PRIMARY KEY NOT NULL,
	"salt" text NOT NULL,
	"identity_public_key" text NOT NULL,
	"agreement_public_key" text NOT NULL,
	"wrapped_private_keys" text NOT NULL,
	"wrap_iv" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_crypto_keys" ADD CONSTRAINT "user_crypto_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
