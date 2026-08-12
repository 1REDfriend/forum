CREATE TABLE "thread_reads" (
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"last_read_at" timestamp NOT NULL,
	CONSTRAINT "thread_reads_pk" PRIMARY KEY("user_id","thread_id")
);
--> statement-breakpoint
ALTER TABLE "thread_reads" ADD CONSTRAINT "thread_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_reads" ADD CONSTRAINT "thread_reads_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "thread_reads_thread_id_idx" ON "thread_reads" USING btree ("thread_id");
