import { Pool } from 'pg';
import { newId } from '../src/db/ids.js';

const POOL = new Pool({ connectionString: process.env.DATABASE_URL });

// Every table that has an integer `id` to convert.
const TABLES = [
  'users',
  'forums',
  'threads',
  'posts',
  'likes',
  'reports',
  'user_badges',
  'password_reset_tokens',
  'refresh_tokens',
] as const;

// FK columns to remap: childTable.column references parentTable.id
const FOREIGN_KEYS: { child: string; column: string; parent: string }[] = [
  { child: 'forums', column: 'created_by', parent: 'users' },
  { child: 'threads', column: 'author_id', parent: 'users' },
  { child: 'threads', column: 'forum_id', parent: 'forums' },
  { child: 'posts', column: 'thread_id', parent: 'threads' },
  { child: 'posts', column: 'author_id', parent: 'users' },
  { child: 'likes', column: 'user_id', parent: 'users' },
  { child: 'likes', column: 'thread_id', parent: 'threads' },
  { child: 'likes', column: 'post_id', parent: 'posts' },
  { child: 'reports', column: 'reporter_id', parent: 'users' },
  { child: 'user_badges', column: 'user_id', parent: 'users' },
  { child: 'password_reset_tokens', column: 'user_id', parent: 'users' },
  { child: 'refresh_tokens', column: 'user_id', parent: 'users' },
];

// NOT NULL FK columns — must be fully remapped (no nulls allowed after migration).
const NOT_NULL_FKS = new Set([
  'threads.author_id',
  'threads.forum_id',
  'posts.thread_id',
  'posts.author_id',
  'likes.user_id',
  'reports.reporter_id',
  'user_badges.user_id',
  'password_reset_tokens.user_id',
  'refresh_tokens.user_id',
]);

async function main() {
  const client = await POOL.connect();
  try {
    await client.query('BEGIN');

    // 1. Build an id map per table: temp table old_id(int) -> new_id(text).
    for (const t of TABLES) {
      await client.query(
        `CREATE TEMP TABLE ${t}_idmap (old_id int PRIMARY KEY, new_id text NOT NULL) ON COMMIT DROP`,
      );
      const { rows } = await client.query(`SELECT id FROM ${t}`);
      for (const r of rows) {
        await client.query(`INSERT INTO ${t}_idmap (old_id, new_id) VALUES ($1, $2)`, [
          r.id,
          newId(),
        ]);
      }
      console.log(`mapped ${rows.length} rows of ${t}`);
    }

    // 2. Drop ALL foreign-key constraints on these tables (names vary; drop dynamically).
    await client.query(`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN
          SELECT conname, conrelid::regclass AS tbl
          FROM pg_constraint
          WHERE contype = 'f'
            AND conrelid::regclass::text = ANY (ARRAY[
              'forums','threads','posts','likes','reports','user_badges',
              'password_reset_tokens','refresh_tokens'])
        LOOP
          EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
        END LOOP;
      END $$;
    `);

    // 3. Convert each table's own id column to text via its idmap.
    for (const t of TABLES) {
      await client.query(`ALTER TABLE ${t} ADD COLUMN id_new text`);
      await client.query(
        `UPDATE ${t} SET id_new = m.new_id FROM ${t}_idmap m WHERE ${t}.id = m.old_id`,
      );
    }

    // 4. Convert each FK column to text via the PARENT idmap.
    for (const fk of FOREIGN_KEYS) {
      const col = fk.column;
      await client.query(`ALTER TABLE ${fk.child} ADD COLUMN ${col}_new text`);
      await client.query(
        `UPDATE ${fk.child} SET ${col}_new = m.new_id
         FROM ${fk.parent}_idmap m
         WHERE ${fk.child}.${col} = m.old_id`,
      );
    }

    // 5. Polymorphic reports.target_id -> text, remapped per target_type.
    await client.query(`ALTER TABLE reports ADD COLUMN target_id_new text`);
    for (const [type, parent] of [
      ['thread', 'threads'],
      ['post', 'posts'],
      ['user', 'users'],
    ] as const) {
      await client.query(
        `UPDATE reports SET target_id_new = m.new_id
         FROM ${parent}_idmap m
         WHERE reports.target_type = $1 AND reports.target_id = m.old_id`,
        [type],
      );
    }

    // 6. VALIDATION — abort (rollback) if anything is inconsistent.
    // 6a. Every id_new is populated.
    for (const t of TABLES) {
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM ${t} WHERE id_new IS NULL`,
      );
      if (rows[0].n > 0) throw new Error(`VALIDATION: ${t} has ${rows[0].n} null id_new`);
    }
    // 6b. NOT-NULL FKs must all be remapped (no orphans). Nullable FKs may stay null
    //     only where the original was null.
    for (const fk of FOREIGN_KEYS) {
      const key = `${fk.child}.${fk.column}`;
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM ${fk.child}
         WHERE ${fk.column} IS NOT NULL AND ${fk.column}_new IS NULL`,
      );
      if (rows[0].n > 0) throw new Error(`VALIDATION: ${key} has ${rows[0].n} orphaned rows`);
      if (NOT_NULL_FKS.has(key)) {
        const { rows: nn } = await client.query(
          `SELECT count(*)::int AS n FROM ${fk.child} WHERE ${fk.column}_new IS NULL`,
        );
        if (nn[0].n > 0) throw new Error(`VALIDATION: ${key} (NOT NULL) has ${nn[0].n} nulls`);
      }
    }
    // 6c. reports.target_id all remapped.
    {
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM reports WHERE target_id IS NOT NULL AND target_id_new IS NULL`,
      );
      if (rows[0].n > 0)
        throw new Error(`VALIDATION: reports.target_id has ${rows[0].n} orphaned rows`);
    }

    // 7. Swap columns: drop old PKs + old columns, rename *_new -> original.
    for (const t of TABLES) {
      await client.query(`ALTER TABLE ${t} DROP CONSTRAINT ${t}_pkey`);
      await client.query(`ALTER TABLE ${t} DROP COLUMN id`);
      await client.query(`ALTER TABLE ${t} RENAME COLUMN id_new TO id`);
      await client.query(`ALTER TABLE ${t} ALTER COLUMN id SET NOT NULL`);
      await client.query(`ALTER TABLE ${t} ADD PRIMARY KEY (id)`);
    }
    for (const fk of FOREIGN_KEYS) {
      await client.query(`ALTER TABLE ${fk.child} DROP COLUMN ${fk.column}`);
      await client.query(`ALTER TABLE ${fk.child} RENAME COLUMN ${fk.column}_new TO ${fk.column}`);
    }
    await client.query(`ALTER TABLE reports DROP COLUMN target_id`);
    await client.query(`ALTER TABLE reports RENAME COLUMN target_id_new TO target_id`);
    await client.query(`ALTER TABLE reports ALTER COLUMN target_id SET NOT NULL`);

    // 8. Re-apply NOT NULL on required FK columns.
    for (const key of NOT_NULL_FKS) {
      const [tbl, col] = key.split('.');
      await client.query(`ALTER TABLE ${tbl} ALTER COLUMN ${col} SET NOT NULL`);
    }

    // 9. Re-add foreign keys with ON DELETE CASCADE (matches schema.ts).
    for (const fk of FOREIGN_KEYS) {
      await client.query(
        `ALTER TABLE ${fk.child}
         ADD CONSTRAINT ${fk.child}_${fk.column}_fk
         FOREIGN KEY (${fk.column}) REFERENCES ${fk.parent}(id) ON DELETE CASCADE`,
      );
    }

    await client.query('COMMIT');
    console.log('migration committed OK');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('migration ROLLED BACK:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await POOL.end();
  }
}

main();
