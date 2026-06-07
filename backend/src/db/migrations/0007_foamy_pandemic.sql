CREATE TABLE "badges" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Seed the original built-in badges so existing installs keep working.
INSERT INTO "badges" ("key", "label", "description", "icon") VALUES
	('first_post', 'ก้าวแรก', 'โพสต์แรกของคุณ', '✍️'),
	('writer_50', 'นักเขียน', 'โพสต์/กระทู้ครบ 50', '📚'),
	('loved_100', 'ขวัญใจมหาชน', 'ได้รับ Like ครบ 100', '💖'),
	('year_one', 'ครบ 1 ปี', 'อยู่กับชุมชนครบ 1 ปี', '🎂'),
	('streak_30', 'สม่ำเสมอ', 'ล็อกอินต่อเนื่อง 30 วัน', '🔥'),
	('helper', 'ผู้ช่วยเหลือชุมชน', 'มอบโดยทีมงาน', '🤝')
ON CONFLICT ("key") DO NOTHING;
