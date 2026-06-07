-- Repair unique constraints lost during the one-shot CUID migration
-- (scripts/migrate-to-cuid.ts rebuilt tables with text ids but did not
-- recreate the composite UNIQUE constraints, so duplicate rows became
-- possible and ON CONFLICT (col,col) inserts failed at runtime).
--
-- Idempotent: safe to run repeatedly. Run against prod with:
--   docker exec -i forum-db sh -c \
--     'psql -U $POSTGRES_USER -d $POSTGRES_DB' < scripts/repair-unique-constraints.sql

DO $$
BEGIN
  -- user_badges: one badge per (user, key)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_badges_user_key_unique') THEN
    DELETE FROM user_badges a USING user_badges b
      WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.badge_key = b.badge_key;
    ALTER TABLE user_badges ADD CONSTRAINT user_badges_user_key_unique UNIQUE (user_id, badge_key);
  END IF;

  -- reports: one report per (reporter, target)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_reporter_target_unique') THEN
    DELETE FROM reports a USING reports b
      WHERE a.ctid < b.ctid AND a.reporter_id = b.reporter_id
        AND a.target_type = b.target_type AND a.target_id = b.target_id;
    ALTER TABLE reports ADD CONSTRAINT reports_reporter_target_unique
      UNIQUE (reporter_id, target_type, target_id);
  END IF;

  -- likes: one like per (user, thread) and (user, post)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_thread_unique') THEN
    DELETE FROM likes a USING likes b
      WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.thread_id = b.thread_id;
    ALTER TABLE likes ADD CONSTRAINT likes_user_thread_unique UNIQUE (user_id, thread_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_post_unique') THEN
    DELETE FROM likes a USING likes b
      WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.post_id = b.post_id;
    ALTER TABLE likes ADD CONSTRAINT likes_user_post_unique UNIQUE (user_id, post_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS reports_target_idx ON reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS user_badges_user_idx ON user_badges (user_id);
