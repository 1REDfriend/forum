import 'dotenv/config';
import { db } from './index.js';
import {
  users,
  forums,
  threads,
  posts,
  likes,
  passwordResetTokens,
  notifications,
  threadReads,
  threadTags,
  tags,
  forumModerators,
  threadWatches,
  reactions,
  pollVotes,
  pollOptions,
  polls,
  directMessages,
  conversations,
  events,
  userBadges,
  reports,
  badges,
} from './schema.js';
import { SEED_BADGES } from '../domain/badges.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

function avatar(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}
function banner(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1200/320`;
}
function pairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
async function insertChunks<T extends Record<string, unknown>>(
  table: any,
  rows: T[],
  size = 40,
) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as any);
  }
}

async function seed() {
  console.log('Seeding full mock database (all features)...');

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run seed in production (would wipe live data).');
  }

  // ─── Cleanup (child tables first) ─────────────────────────────────────────
  console.log('Cleaning up existing data...');
  await db.delete(pollVotes);
  await db.delete(pollOptions);
  await db.delete(polls);
  await db.delete(directMessages);
  await db.delete(conversations);
  await db.delete(reactions);
  await db.delete(threadWatches);
  await db.delete(threadTags);
  await db.delete(tags);
  await db.delete(forumModerators);
  await db.delete(events);
  await db.delete(notifications);
  await db.delete(threadReads);
  await db.delete(likes);
  await db.delete(reports);
  await db.delete(userBadges);
  await db.delete(passwordResetTokens);
  await db.delete(posts);
  await db.delete(threads);
  await db.delete(forums);
  await db.delete(users);
  // Keep badge catalog rows; re-upsert built-ins below

  // ─── Users (rich profiles) ────────────────────────────────────────────────
  console.log('Creating users with full profiles...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const today = new Date().toISOString().slice(0, 10);

  const createdUsers = await db
    .insert(users)
    .values([
      {
        name: 'Admin User',
        email: 'admin@forum.com',
        passwordHash,
        authProvider: 'local',
        role: 'admin',
        tier: 'conqueror',
        score: 4200,
        loginStreak: 45,
        longestStreak: 60,
        lastLoginDate: today,
        avatar: avatar('AdminUser'),
        banner: banner('admin-banner'),
        bio: 'Site administrator. Keeping IT.FORUM tidy. 🛠️\n\nContact via Reports tab.',
      },
      {
        name: 'John Tech',
        email: 'john@tech.com',
        passwordHash,
        authProvider: 'local',
        role: 'manager',
        tier: 'growing',
        score: 980,
        loginStreak: 12,
        longestStreak: 30,
        lastLoginDate: today,
        avatar: avatar('JohnTech'),
        banner: banner('john-banner'),
        bio: 'Backend dev — Node, Go, and a little Rust. Manager of Help & Backend boards.',
      },
      {
        name: 'Alice Coder',
        email: 'alice@code.com',
        passwordHash,
        authProvider: 'local',
        role: 'user',
        tier: 'strong',
        score: 2100,
        loginStreak: 7,
        longestStreak: 21,
        lastLoginDate: today,
        avatar: avatar('AliceCoder'),
        banner: banner('alice-banner'),
        bio: 'Vue enthusiast & open-source contributor. Love Markdown and clean UI. 💜',
      },
      {
        name: 'Google Fan',
        email: 'fan@gmail.com',
        googleId: 'google-seed-123',
        authProvider: 'google',
        role: 'user',
        tier: 'sprout',
        score: 240,
        loginStreak: 3,
        longestStreak: 5,
        lastLoginDate: today,
        avatar: avatar('GoogleFan'),
        banner: banner('fan-banner'),
        bio: 'Just here to learn 🙂 Signed in with Google.',
      },
      {
        name: 'Somsak Dev',
        email: 'somsak@thai.dev',
        passwordHash,
        authProvider: 'local',
        role: 'user',
        tier: 'wanderer',
        score: 80,
        loginStreak: 1,
        longestStreak: 2,
        lastLoginDate: today,
        avatar: avatar('SomsakDev'),
        banner: banner('somsak-banner'),
        bio: 'น้องใหม่หัดเขียนโค้ด อยากถามได้ทุกอย่าง 🙏',
      },
      {
        name: 'Mina Design',
        email: 'mina@design.dev',
        passwordHash,
        authProvider: 'local',
        role: 'user',
        tier: 'growing',
        score: 640,
        loginStreak: 9,
        longestStreak: 14,
        lastLoginDate: today,
        avatar: avatar('MinaDesign'),
        banner: banner('mina-banner'),
        bio: 'UI/UX · Figma · design systems. Moderator of Design board.',
      },
      {
        name: 'Chris Ops',
        email: 'chris@ops.dev',
        passwordHash,
        authProvider: 'local',
        role: 'user',
        tier: 'strong',
        score: 1500,
        loginStreak: 18,
        longestStreak: 40,
        lastLoginDate: today,
        avatar: avatar('ChrisOps'),
        banner: banner('chris-banner'),
        bio: 'DevOps · Docker · CI/CD · on-call survivor.',
      },
      {
        name: 'Banned Spammer',
        email: 'spammer@bad.com',
        passwordHash,
        authProvider: 'local',
        role: 'user',
        tier: 'wanderer',
        score: 0,
        avatar: avatar('Spammer'),
        banner: banner('spam-banner'),
        bio: 'demo banned account',
        isBanned: true,
        banReason: 'สแปมโฆษณาซ้ำ ๆ',
        bannedAt: new Date(),
      },
    ])
    .returning();

  const admin = createdUsers[0]!;
  const john = createdUsers[1]!;
  const alice = createdUsers[2]!;
  const fan = createdUsers[3]!;
  const somsak = createdUsers[4]!;
  const mina = createdUsers[5]!;
  const chris = createdUsers[6]!;
  const spammer = createdUsers[7]!;
  // Fix bannedBy after admin exists
  await db.update(users).set({ bannedBy: admin.id }).where(eq(users.id, spammer.id));

  const activeUsers = [admin, john, alice, fan, somsak, mina, chris];

  // ─── Badges catalog + grants ──────────────────────────────────────────────
  console.log('Upserting badges + awarding user badges...');
  for (const b of SEED_BADGES) {
    await db
      .insert(badges)
      .values({ key: b.key, label: b.label, description: b.desc, icon: b.icon })
      .onConflictDoUpdate({
        target: badges.key,
        set: { label: b.label, description: b.desc, icon: b.icon },
      });
  }
  await db.insert(userBadges).values([
    { userId: admin.id, badgeKey: 'first_post' },
    { userId: admin.id, badgeKey: 'writer_50' },
    { userId: admin.id, badgeKey: 'helper' },
    { userId: admin.id, badgeKey: 'streak_30' },
    { userId: john.id, badgeKey: 'first_post' },
    { userId: john.id, badgeKey: 'helper' },
    { userId: alice.id, badgeKey: 'first_post' },
    { userId: alice.id, badgeKey: 'loved_100' },
    { userId: mina.id, badgeKey: 'first_post' },
    { userId: chris.id, badgeKey: 'first_post' },
    { userId: chris.id, badgeKey: 'streak_30' },
    { userId: fan.id, badgeKey: 'first_post' },
    { userId: somsak.id, badgeKey: 'first_post' },
  ]);

  // ─── Forums ───────────────────────────────────────────────────────────────
  console.log('Creating forums...');
  const coreForumRows = [
    {
      name: 'Announcements',
      description: 'ข่าวสารอย่างเป็นทางการ กฎชุมชน และการอัปเดตจากแอดมิน',
      postRoleMin: 'manager' as string | null,
      createdBy: admin.id,
    },
    {
      name: 'General',
      description: 'พูดคุยทั่วไป ถาม-ตอบ และแลกเปลี่ยนไอเดีย',
      postRoleMin: null as string | null,
      createdBy: admin.id,
    },
    {
      name: 'Help & Feedback',
      description: 'รายงานบั๊ก ขอความช่วยเหลือ และข้อเสนอแนะต่อแพลตฟอร์ม',
      postRoleMin: null as string | null,
      createdBy: john.id,
    },
    {
      name: 'Showcase',
      description: 'โชว์โปรเจกต์ ผลงาน และการทดลองของคุณ',
      postRoleMin: null as string | null,
      createdBy: alice.id,
    },
  ];
  const extraBoardDefs = [
    { name: 'Frontend', description: 'Vue, React, CSS, design systems' },
    { name: 'Backend', description: 'API, databases, servers, Bun/Node' },
    { name: 'DevOps', description: 'Docker, CI/CD, deploy, monitoring' },
    { name: 'Mobile', description: 'iOS, Android, Flutter, React Native' },
    { name: 'Career', description: 'งาน สัมภาษณ์ พอร์ตโฟลิโอ' },
    { name: 'Off-Topic', description: 'คุยเล่น นอกเรื่องเทคนิค' },
    { name: 'AI & ML', description: 'โมเดล, prompt, tools, research' },
    { name: 'Security', description: 'Auth, OWASP, hardening' },
    { name: 'Database', description: 'Postgres, schema, query tuning' },
    { name: 'Tools', description: 'Editor, CLI, workflow tips' },
    { name: 'University', description: 'วิชา โปรเจกต์จบ กิจกรรม' },
    { name: 'Games', description: 'เกม อีสปอร์ต แนะนำเกม' },
    { name: 'Hardware', description: 'พีซี โน้ตบุ๊ก อุปกรณ์' },
    { name: 'Design', description: 'UI/UX Figma illustration' },
    { name: 'Open Source', description: 'contrib, license, community' },
    { name: 'Mock Board 16', description: 'บอร์ดทดสอบ scroll #16' },
    { name: 'Mock Board 17', description: 'บอร์ดทดสอบ scroll #17' },
    { name: 'Mock Board 18', description: 'บอร์ดทดสอบ scroll #18' },
    { name: 'Mock Board 19', description: 'บอร์ดทดสอบ scroll #19' },
    { name: 'Mock Board 20', description: 'บอร์ดทดสอบ scroll #20' },
  ];
  const extraForumRows = extraBoardDefs.map((b, i) => ({
    name: b.name,
    description: b.description,
    postRoleMin: null as string | null,
    createdBy: activeUsers[i % activeUsers.length]!.id,
  }));
  const createdForums = await db
    .insert(forums)
    .values([...coreForumRows, ...extraForumRows])
    .returning();

  const newsForum = createdForums.find((f) => f.name === 'Announcements')!;
  const generalForum = createdForums.find((f) => f.name === 'General')!;
  const helpForum = createdForums.find((f) => f.name === 'Help & Feedback')!;
  const showcaseForum = createdForums.find((f) => f.name === 'Showcase')!;
  const designForum = createdForums.find((f) => f.name === 'Design')!;
  const backendForum = createdForums.find((f) => f.name === 'Backend')!;
  const devopsForum = createdForums.find((f) => f.name === 'DevOps')!;

  // Moderators
  console.log('Assigning board moderators...');
  await db.insert(forumModerators).values([
    { forumId: helpForum.id, userId: john.id },
    { forumId: backendForum.id, userId: john.id },
    { forumId: designForum.id, userId: mina.id },
    { forumId: devopsForum.id, userId: chris.id },
    { forumId: generalForum.id, userId: alice.id },
  ]);

  // Extra boards welcome threads
  const extraForums = createdForums.filter(
    (f) => !['Announcements', 'General', 'Help & Feedback', 'Showcase'].includes(f.name),
  );
  const extraBoardThreads = extraForums.map((f, i) => ({
    title: `Welcome to ${f.name}`,
    content: `กระทู้แนะนำหมวด **${f.name}**\n\n${f.description ?? ''}\n\n(Mock seed)`,
    authorId: activeUsers[i % activeUsers.length]!.id,
    forumId: f.id,
    isPinned: i < 3,
    isQa: false,
  }));
  const extraWelcome = extraBoardThreads.length
    ? await db.insert(threads).values(extraBoardThreads).returning()
    : [];

  // ─── Core + bulk threads ──────────────────────────────────────────────────
  console.log('Creating core threads (rules, Q&A, poll, locked)...');
  const createdThreads = await db
    .insert(threads)
    .values([
      {
        title: 'กฎของชุมชน (Rules)',
        content: `# กฎของชุมชน IT.FORUM\n\n1. **เคารพผู้อื่น**\n2. **ห้ามสแปม**\n3. **ใช้ Markdown**\n4. **รายงานเมื่อเจอปัญหา**`,
        authorId: admin.id,
        forumId: newsForum.id,
        isPinned: true,
        isQa: false,
      },
      {
        title: 'เริ่มที่นี่ (Start here)',
        content: `# เริ่มต้นใช้งาน\n\n- โพสต์ด้วย Markdown\n- กด Quote / Watch / Reaction ได้\n- ดู Leaderboard และ Calendar ได้จากเมนู`,
        authorId: admin.id,
        forumId: newsForum.id,
        isPinned: true,
        isQa: false,
      },
      {
        title: 'แนะนำตัวหน่อย! คุณมาจากสายไหน',
        content:
          'สวัสดีครับ มาแนะนำตัวกันหน่อย เขียนโค้ดสายไหน?\n\nMention ทดสอบ: [@John Tech](user:PLACEHOLDER_JOHN)',
        authorId: alice.id,
        forumId: generalForum.id,
        isQa: false,
      },
      {
        title: 'Best practices for API design',
        content:
          '**GraphQL vs REST** in modern apps. What are your thoughts?\n\n![diagram](https://picsum.photos/seed/api/640/200)',
        authorId: fan.id,
        forumId: generalForum.id,
        isQa: false,
      },
      {
        title: 'Q&A: ทำไม CORS บล็อก 127.0.0.1',
        content:
          'เปิด frontend ที่ 127.0.0.1 แล้ว API localhost ยิงไม่ผ่าน — แก้ยังไง?\n\n(นี่คือ **Q&A thread** ลอง Accept คำตอบได้)',
        authorId: somsak.id,
        forumId: helpForum.id,
        isQa: true,
      },
      {
        title: 'Poll: คุณใช้ package manager อะไร',
        content: 'โหวตด้านล่างได้เลย — ใช้ทดสอบระบบ poll',
        authorId: chris.id,
        forumId: generalForum.id,
        isQa: false,
      },
      {
        title: 'Locked thread example',
        content: 'กระทู้นี้ถูกล็อกเพื่อทดสอบ UI 🔒',
        authorId: admin.id,
        forumId: generalForum.id,
        isLocked: true,
        isQa: false,
      },
      {
        title: 'อัปโหลดรูปแล้วไม่ขึ้นบนโพสต์',
        content: 'ลองวางรูปใน Markdown editor แล้ว preview ว่าง — มีใครเจอไหม?',
        authorId: somsak.id,
        forumId: helpForum.id,
        isQa: false,
      },
      {
        title: 'โปรเจกต์ฟอรัมนี้สร้างด้วยอะไรบ้าง',
        content: 'Stack: **Vue 3 + Hono + Drizzle + PostgreSQL** บน Bun',
        authorId: john.id,
        forumId: showcaseForum.id,
        isQa: false,
      },
      {
        title: 'Figma tokens → Tailwind ยังไงดี',
        content: 'อยาก sync design tokens อัตโนมัติ มี workflow แนะนำไหม?',
        authorId: mina.id,
        forumId: designForum.id,
        isQa: true,
      },
    ])
    .returning();

  // Fix mention placeholder with real John id
  const intro = createdThreads.find((t) => t.title.includes('แนะนำตัว'))!;
  await db
    .update(threads)
    .set({
      content: `สวัสดีครับ มาแนะนำตัวกันหน่อย เขียนโค้ดสายไหน?\n\nMention ทดสอบ: [@John Tech](user:${john.id})`,
    })
    .where(eq(threads.id, intro.id));

  const bulkTopics = [
    'Vite เร็วจริงไหมในปี 2026',
    'TypeScript strict mode คุ้มไหม',
    'Docker บน Windows ช้าไหม',
    'Postgres vs SQLite สำหรับโปรเจกต์เล็ก',
    'ทำไมต้อง Hono แทน Express',
    'Vue 3 Composition API tips',
    'Pinia หรือ Vuex ยังไงดี',
    'เขียน unit test ด้วย bun test',
    'CSS variables กับ dark mode',
    'วิธีออกแบบ forum schema',
    'CDN รูปภาพควร cache ยังไง',
    'OAuth Google ติด CORS',
    'Rate limit แบบไหนดี',
    'Markdown XSS ป้องกันยังไง',
    'Mobile overflow แก้ยังไง',
    'Leaderboard คำนวณ score',
    'Notification ควร poll หรือ SSE',
    'Seed data ทำ pagination test',
    'Draft: หัวข้อทดลอง #19',
    'Draft: หัวข้อทดลอง #20',
    'Draft: หัวข้อทดลอง #21',
    'Draft: หัวข้อทดลอง #22',
  ];
  console.log(`Creating ${bulkTopics.length} extra General threads...`);
  const bulkThreads = await db
    .insert(threads)
    .values(
      bulkTopics.map((title, i) => ({
        title,
        content: `Mock thread #${i + 1} สำหรับ pagination\n\n**${title}**\n\n![img](https://picsum.photos/seed/t${i}/480/160)`,
        authorId: activeUsers[i % activeUsers.length]!.id,
        forumId: generalForum.id,
        isQa: i % 7 === 0,
      })),
    )
    .returning();

  const allThreads = [...createdThreads, ...bulkThreads, ...extraWelcome];
  const qaThread = createdThreads.find((t) => t.title.startsWith('Q&A:'))!;
  const pollThread = createdThreads.find((t) => t.title.startsWith('Poll:'))!;
  const apiThread = createdThreads.find((t) => t.title.includes('API design'))!;
  const showcaseThread = createdThreads.find((t) => t.title.includes('โปรเจกต์ฟอรัม'))!;
  const busyThread = bulkThreads[0]!;

  // ─── Tags ─────────────────────────────────────────────────────────────────
  console.log('Creating tags + thread_tags...');
  const tagDefs = [
    { slug: 'vue', label: 'Vue' },
    { slug: 'typescript', label: 'TypeScript' },
    { slug: 'help', label: 'Help' },
    { slug: 'beginner', label: 'Beginner' },
    { slug: 'devops', label: 'DevOps' },
    { slug: 'design', label: 'Design' },
    { slug: 'announcement', label: 'Announcement' },
    { slug: 'qa', label: 'Q&A' },
    { slug: 'poll', label: 'Poll' },
    { slug: 'mock', label: 'Mock' },
  ];
  const createdTags = await db.insert(tags).values(tagDefs).returning();
  const tagBySlug = Object.fromEntries(createdTags.map((t) => [t.slug, t]));
  const threadTagRows: { threadId: string; tagId: string }[] = [];
  const addTags = (threadId: string, slugs: string[]) => {
    for (const s of slugs) {
      const tag = tagBySlug[s];
      if (tag) threadTagRows.push({ threadId, tagId: tag.id });
    }
  };
  addTags(intro.id, ['beginner', 'vue']);
  addTags(apiThread.id, ['typescript', 'help']);
  addTags(qaThread.id, ['help', 'qa', 'beginner']);
  addTags(pollThread.id, ['poll', 'mock']);
  addTags(showcaseThread.id, ['vue', 'mock']);
  for (let i = 0; i < bulkThreads.length; i++) {
    addTags(bulkThreads[i]!.id, ['mock', i % 2 === 0 ? 'typescript' : 'vue']);
  }
  if (threadTagRows.length) await insertChunks(threadTags, threadTagRows);

  // ─── Poll ─────────────────────────────────────────────────────────────────
  console.log('Creating poll + votes...');
  const [poll] = await db
    .insert(polls)
    .values({
      threadId: pollThread.id,
      question: 'คุณใช้ package manager อะไรเป็นหลัก?',
      closesAt: new Date(Date.now() + 7 * 864e5),
    })
    .returning();
  const pollOpts = await db
    .insert(pollOptions)
    .values([
      { pollId: poll!.id, label: 'npm', sortOrder: 0 },
      { pollId: poll!.id, label: 'pnpm', sortOrder: 1 },
      { pollId: poll!.id, label: 'yarn', sortOrder: 2 },
      { pollId: poll!.id, label: 'bun', sortOrder: 3 },
    ])
    .returning();
  await db.insert(pollVotes).values([
    { pollId: poll!.id, optionId: pollOpts[3]!.id, userId: admin.id },
    { pollId: poll!.id, optionId: pollOpts[3]!.id, userId: john.id },
    { pollId: poll!.id, optionId: pollOpts[1]!.id, userId: alice.id },
    { pollId: poll!.id, optionId: pollOpts[0]!.id, userId: fan.id },
    { pollId: poll!.id, optionId: pollOpts[3]!.id, userId: chris.id },
    { pollId: poll!.id, optionId: pollOpts[2]!.id, userId: mina.id },
  ]);

  // ─── Posts ────────────────────────────────────────────────────────────────
  console.log('Creating posts (incl. accepted answer + many replies)...');
  const postsToInsert: Array<{
    content: string;
    threadId: string;
    authorId: string;
    replyToPostId?: string | null;
    isAccepted?: boolean;
  }> = [];

  postsToInsert.push(
    {
      content: 'ผมทำ backend เป็นหลัก — Node, Go, และกำลังลอง Rust อยู่ครับ',
      threadId: intro.id,
      authorId: john.id,
    },
    {
      content: 'น้องใหม่หัด Vue อยู่ครับ ดีใจที่มีที่ถามได้! [@Alice Coder](user:' + alice.id + ')',
      threadId: intro.id,
      authorId: somsak.id,
    },
    {
      content: 'REST ยังดีสำหรับ CRUD ส่วน GraphQL เหมาะกับ frontend ที่ต้องการ shape ยืดหยุ่น',
      threadId: apiThread.id,
      authorId: alice.id,
    },
    {
      content: '**คำตอบ:** ตั้ง `FRONTEND_URL` ให้มีทั้ง `localhost` และ `127.0.0.1` (CORS แยก origin)',
      threadId: qaThread.id,
      authorId: john.id,
      isAccepted: true,
    },
    {
      content: 'ผมเจอเหมือนกัน รีสตาร์ท backend หลังแก้ env ด้วยนะ',
      threadId: qaThread.id,
      authorId: chris.id,
    },
    {
      content: 'ลอง hard refresh หรือเช็ค URL รูปขึ้นต้นด้วย https /uploads',
      threadId: createdThreads.find((t) => t.title.includes('อัปโหลด'))!.id,
      authorId: admin.id,
    },
    {
      content: 'ชอบที่รองรับ Markdown + attachment ใหญ่ครับ!',
      threadId: showcaseThread.id,
      authorId: fan.id,
    },
    {
      content: 'แนะนำ Figma Tokens Studio → Style Dictionary → Tailwind theme',
      threadId: createdThreads.find((t) => t.title.includes('Figma'))!.id,
      authorId: mina.id,
      isAccepted: true,
    },
  );

  for (let i = 0; i < bulkThreads.length; i++) {
    postsToInsert.push({
      content: `ตอบ mock #${i + 1}: เห็นด้วยกับหัวข้อนี้ครับ`,
      threadId: bulkThreads[i]!.id,
      authorId: activeUsers[(i + 1) % activeUsers.length]!.id,
    });
  }

  for (let i = 1; i <= 28; i++) {
    postsToInsert.push({
      content: `Reply mock ${i}/28 บนกระทู้ busy — ทดสอบ pagination replies (8 ต่อหน้า)\n\n> quote ตัวอย่าง`,
      threadId: busyThread.id,
      authorId: activeUsers[i % activeUsers.length]!.id,
    });
  }

  await insertChunks(posts, postsToInsert);

  // Load some posts for likes/reactions/replyTo
  const somePosts = await db.select().from(posts).limit(40);
  const qaPosts = somePosts.filter((p) => p.threadId === qaThread.id);
  const accepted = qaPosts.find((p) => p.isAccepted);
  if (accepted && qaPosts.length > 1) {
    const other = qaPosts.find((p) => p.id !== accepted.id);
    if (other) {
      await db
        .update(posts)
        .set({ replyToPostId: accepted.id })
        .where(eq(posts.id, other.id));
    }
  }

  // ─── Likes ────────────────────────────────────────────────────────────────
  console.log('Creating likes...');
  const likeRows: { userId: string; threadId?: string | null; postId?: string | null }[] = [];
  for (let i = 0; i < Math.min(12, allThreads.length); i++) {
    const t = allThreads[i]!;
    for (const u of activeUsers) {
      if (u.id === t.authorId) continue;
      if (likeRows.length % 3 === 0) {
        likeRows.push({ userId: u.id, threadId: t.id, postId: null });
      }
    }
  }
  for (let i = 0; i < Math.min(20, somePosts.length); i++) {
    const p = somePosts[i]!;
    const liker = activeUsers[(i + 2) % activeUsers.length]!;
    if (liker.id !== p.authorId) {
      likeRows.push({ userId: liker.id, threadId: null, postId: p.id });
    }
  }
  // dedupe roughly by unique constraint pairs
  const seenLike = new Set<string>();
  const uniqueLikes = likeRows.filter((r) => {
    const k = r.threadId ? `t:${r.userId}:${r.threadId}` : `p:${r.userId}:${r.postId}`;
    if (seenLike.has(k)) return false;
    seenLike.add(k);
    return true;
  });
  if (uniqueLikes.length) await insertChunks(likes, uniqueLikes);

  // ─── Reactions ────────────────────────────────────────────────────────────
  console.log('Creating reactions...');
  const emojis = ['❤️', '🔥', '😂', '🎉', '👀', '👍', '💡'];
  const reactionRows: {
    userId: string;
    emoji: string;
    threadId: string | null;
    postId: string | null;
  }[] = [];
  for (let i = 0; i < 10; i++) {
    const t = allThreads[i]!;
    reactionRows.push({
      userId: activeUsers[(i + 1) % activeUsers.length]!.id,
      emoji: emojis[i % emojis.length]!,
      threadId: t.id,
      postId: null,
    });
  }
  for (let i = 0; i < Math.min(15, somePosts.length); i++) {
    reactionRows.push({
      userId: activeUsers[i % activeUsers.length]!.id,
      emoji: emojis[(i + 2) % emojis.length]!,
      threadId: null,
      postId: somePosts[i]!.id,
    });
  }
  if (reactionRows.length) await insertChunks(reactions, reactionRows);

  // ─── Watches + thread reads ───────────────────────────────────────────────
  console.log('Creating watches + read cursors...');
  await db.insert(threadWatches).values([
    { userId: alice.id, threadId: intro.id },
    { userId: alice.id, threadId: busyThread.id },
    { userId: john.id, threadId: qaThread.id },
    { userId: somsak.id, threadId: qaThread.id },
    { userId: mina.id, threadId: showcaseThread.id },
    { userId: chris.id, threadId: pollThread.id },
    { userId: fan.id, threadId: busyThread.id },
  ]);
  const now = new Date();
  await db.insert(threadReads).values([
    { userId: alice.id, threadId: intro.id, lastReadAt: now },
    { userId: john.id, threadId: qaThread.id, lastReadAt: new Date(now.getTime() - 864e5) },
    { userId: somsak.id, threadId: busyThread.id, lastReadAt: new Date(0) },
  ]);

  // ─── Notifications ────────────────────────────────────────────────────────
  console.log('Creating notifications...');
  await db.insert(notifications).values([
    {
      userId: alice.id,
      type: 'thread_reply',
      actorId: john.id,
      entityType: 'post',
      entityId: somePosts[0]?.id ?? null,
      threadId: intro.id,
      payload: JSON.stringify({ snippet: 'ผมทำ backend เป็นหลัก', threadTitle: intro.title }),
      readAt: null,
    },
    {
      userId: alice.id,
      type: 'mention',
      actorId: somsak.id,
      entityType: 'post',
      entityId: somePosts[1]?.id ?? null,
      threadId: intro.id,
      payload: JSON.stringify({ snippet: 'ดีใจที่มีที่ถามได้', threadTitle: intro.title }),
      readAt: null,
    },
    {
      userId: somsak.id,
      type: 'post_reply',
      actorId: john.id,
      entityType: 'post',
      entityId: accepted?.id ?? null,
      threadId: qaThread.id,
      payload: JSON.stringify({ snippet: 'คำตอบ CORS', threadTitle: qaThread.title }),
      readAt: null,
    },
    {
      userId: alice.id,
      type: 'like_thread',
      actorId: fan.id,
      entityType: 'thread',
      entityId: intro.id,
      threadId: intro.id,
      payload: JSON.stringify({ threadTitle: intro.title }),
      readAt: new Date(),
    },
    {
      userId: john.id,
      type: 'badge_awarded',
      actorId: null,
      entityType: 'badge',
      entityId: 'helper',
      payload: JSON.stringify({ badgeKey: 'helper', label: 'ผู้ช่วยเหลือชุมชน', icon: '🤝' }),
      readAt: null,
    },
    {
      userId: mina.id,
      type: 'thread_reply',
      actorId: alice.id,
      entityType: 'post',
      threadId: showcaseThread.id,
      payload: JSON.stringify({ snippet: 'nice project', threadTitle: showcaseThread.title }),
      readAt: null,
    },
  ]);

  // ─── Reports ──────────────────────────────────────────────────────────────
  console.log('Creating reports...');
  await db.insert(reports).values([
    {
      reporterId: alice.id,
      targetType: 'user',
      targetId: spammer.id,
      reason: 'สแปมใน bio / พฤติกรรมน่าสงสัย',
      status: 'reviewed',
    },
    {
      reporterId: john.id,
      targetType: 'thread',
      targetId: busyThread.id,
      reason: 'ทดสอบ report (mock) — ไม่จำเป็นต้อง action',
      status: 'open',
    },
    {
      reporterId: somsak.id,
      targetType: 'post',
      targetId: somePosts[0]!.id,
      reason: 'เนื้อหาไม่เกี่ยวข้อง (mock)',
      status: 'dismissed',
    },
  ]);

  // ─── DMs ──────────────────────────────────────────────────────────────────
  console.log('Creating DMs...');
  const [ua, ub] = pairIds(alice.id, john.id);
  const [convAJ] = await db
    .insert(conversations)
    .values({ userAId: ua, userBId: ub, lastMessageAt: now })
    .returning();
  const [uc, ud] = pairIds(somsak.id, alice.id);
  const [convSA] = await db
    .insert(conversations)
    .values({
      userAId: uc,
      userBId: ud,
      lastMessageAt: new Date(now.getTime() - 3600e3),
    })
    .returning();
  await db.insert(directMessages).values([
    {
      conversationId: convAJ!.id,
      senderId: alice.id,
      body: 'John ช่วยดู CORS issue ให้หน่อยได้ไหม?',
      readAt: new Date(now.getTime() - 1000),
      createdAt: new Date(now.getTime() - 7200e3),
    },
    {
      conversationId: convAJ!.id,
      senderId: john.id,
      body: 'ได้เลย — ลองใส่ 127.0.0.1 ใน FRONTEND_URL ก่อน',
      readAt: null,
      createdAt: new Date(now.getTime() - 3600e3),
    },
    {
      conversationId: convAJ!.id,
      senderId: alice.id,
      body: 'โอเค ขอบคุณมาก 🙏',
      readAt: null,
      createdAt: now,
    },
    {
      conversationId: convSA!.id,
      senderId: somsak.id,
      body: 'Alice สวัสดีครับ อยากเรียน Vue เริ่มยังไงดี?',
      readAt: new Date(now.getTime() - 1800e3),
      createdAt: new Date(now.getTime() - 864e5),
    },
    {
      conversationId: convSA!.id,
      senderId: alice.id,
      body: 'เริ่มจาก docs + ทำ todo app สั้น ๆ ก่อนเลย!',
      readAt: null,
      createdAt: new Date(now.getTime() - 800e5),
    },
  ]);

  // ─── Calendar events ──────────────────────────────────────────────────────
  console.log('Creating calendar events...');
  await db.insert(events).values([
    {
      title: 'IT.FORUM Community Meetup',
      description: 'พบปะออนไลน์ พูดคุย stack และ roadmap',
      startsAt: new Date(Date.now() + 3 * 864e5),
      endsAt: new Date(Date.now() + 3 * 864e5 + 2 * 3600e3),
      createdBy: admin.id,
    },
    {
      title: 'Workshop: Hono + Drizzle',
      description: 'มือใหม่หัด API กับ Bun',
      startsAt: new Date(Date.now() + 10 * 864e5),
      endsAt: null,
      createdBy: john.id,
    },
    {
      title: 'Design critique night',
      description: 'รีวิว UI จากสมาชิก',
      startsAt: new Date(Date.now() + 14 * 864e5),
      createdBy: mina.id,
    },
  ]);

  console.log('✅ Full seed complete!');
  console.log(`   users=${createdUsers.length} forums=${createdForums.length} threads=${allThreads.length}`);
  console.log(`   posts≈${postsToInsert.length} likes=${uniqueLikes.length} reactions=${reactionRows.length}`);
  console.log(`   tags=${createdTags.length} mods=5 watches=7 notifs=6 reports=3 dms=2 convs events=3`);
  console.log('   Profiles: avatar+banner+bio+score+streak on all users');
  console.log('   Login: alice@code.com / password123 (etc.)');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Failed to seed db:', err);
  process.exit(1);
});
