import 'dotenv/config';
import { db } from './index.js';
import { users, forums, threads, posts, likes, passwordResetTokens } from './schema.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding mock database...');

  // 1. Clear existing data to prevent duplicates on rerun
  console.log('Cleaning up existing data...');
  await db.delete(likes);
  await db.delete(passwordResetTokens);
  await db.delete(posts);
  await db.delete(threads);
  await db.delete(forums);
  await db.delete(users);

  // 2. Create Users
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const createdUsers = await db.insert(users).values([
    { name: 'Admin User', email: 'admin@forum.com', passwordHash, authProvider: 'local', role: 'admin', tier: 'Diamond', bio: 'Site administrator. Keeping IT.FORUM tidy.' },
    { name: 'John Tech', email: 'john@tech.com', passwordHash, authProvider: 'local', tier: 'Gold', bio: 'Backend dev — Node, Go, and a little Rust.' },
    { name: 'Alice Coder', email: 'alice@code.com', passwordHash, authProvider: 'local', tier: 'Platinum', bio: 'Vue enthusiast & open-source contributor.' },
    { name: 'Google Fan', email: 'fan@gmail.com', googleId: 'google-123', authProvider: 'google', tier: 'Silver', bio: 'Just here to learn 🙂' },
    { name: 'Somsak Dev', email: 'somsak@thai.dev', passwordHash, authProvider: 'local', tier: 'Bronze', bio: 'น้องใหม่หัดเขียนโค้ด' },
  ]).returning();

  const admin = createdUsers[0]!;
  const john = createdUsers[1]!;
  const alice = createdUsers[2]!;
  const fan = createdUsers[3]!;
  const somsak = createdUsers[4]!;

  // 3. Create Forums
  console.log('Creating forums...');
  const createdForums = await db.insert(forums).values([
    { name: 'Vue.js Ecosystem', description: 'Discussion about Vue, Nuxt, Pinia, and Vite.' },
    { name: 'General Programming', description: 'General talk about algorithms, languages, and architecture.' },
    { name: 'Hardware & PC Build', description: 'Showcase your rigs and ask hardware questions.' },
    { name: 'Off-Topic Chill', description: 'Talk about movies, games, life, and everything else.' },
    { name: 'Announcements', description: 'Official news and updates from the admins.' },
  ]).returning();

  const vueForum = createdForums[0]!;
  const generalForum = createdForums[1]!;
  const hwForum = createdForums[2]!;
  const chillForum = createdForums[3]!;
  const newsForum = createdForums[4]!;

  // 4. Create Threads
  console.log('Creating threads...');
  const createdThreads = await db.insert(threads).values([
    // Announcements (pinned)
    { title: 'Welcome to the new IT Forum!', content: '# Welcome! 🎉\n\nWe are excited to launch this new platform.\n\n**Please read the rules before posting:**\n1. Be respectful to others\n2. No spam or off-topic posts\n3. Use Markdown for better formatting\n\nEnjoy your stay!', authorId: admin.id, forumId: newsForum.id, isPinned: true },
    { title: 'Scheduled Maintenance next Friday', content: 'The server will be **down for about 2 hours** next Friday at 2 AM UTC for database upgrades.\n\nPlease save your work before then.', authorId: admin.id, forumId: newsForum.id },

    // Vue
    { title: 'Composition API vs Options API in 2026', content: 'Are people still using **Options API** for new projects?\n\nI feel like `<script setup>` is just too good to ignore now. The code organization with composables is so clean.', authorId: alice.id, forumId: vueForum.id },
    { title: 'Help with Pinia state persistence', content: 'I am trying to use `pinia-plugin-persistedstate` but it seems to lose data on hard refresh.\n\n```ts\nconst store = defineStore("my", () => {\n  const count = ref(0);\n  return { count };\n}, { persist: true });\n```\n\nAny tips?', authorId: somsak.id, forumId: vueForum.id },

    // General
    { title: 'Is Rust worth learning for Web Backend?', content: 'I have been a **Node.js dev for 5 years**. Thinking of trying Rust with Axum. Is the ecosystem mature enough for standard CRUD apps?', authorId: john.id, forumId: generalForum.id },
    { title: 'Best practices for API design', content: '**GraphQL vs REST** in modern apps. What are your thoughts?\n\nI personally still lean towards REST for simplicity, but GraphQL shines for complex frontend needs.', authorId: fan.id, forumId: generalForum.id },

    // Hardware
    { title: 'RTX 5090 vs RX 8900 XTX benchmark leaks', content: 'Just saw the new leaks. Looks like **Nvidia is pulling ahead in raytracing** again, but AMD has massive VRAM. What are you buying?', authorId: john.id, forumId: hwForum.id },

    // Chill
    { title: 'What games are you playing this weekend?', content: 'Just picked up the new Final Fantasy. The graphics are insane! 🎮', authorId: somsak.id, forumId: chillForum.id },
    { title: 'Best coffee beans for espresso?', content: 'I recently bought a cheap espresso machine. Need recommendations for **dark roast beans**. ☕', authorId: alice.id, forumId: chillForum.id },
  ]).returning();

  // 5. Create Posts (Replies)
  console.log('Creating posts...');

  const compApiThread = createdThreads.find(t => t.title.includes('Composition API'));
  const rustThread = createdThreads.find(t => t.title.includes('Rust'));
  const coffeeThread = createdThreads.find(t => t.title.includes('coffee beans'));

  const postsToInsert: Array<{ content: string; threadId: number; authorId: number }> = [];

  if (compApiThread) {
    postsToInsert.push({ content: 'I switched to Composition API 3 years ago and never looked back. The logic reuse with **composables** is just unmatched.', threadId: compApiThread.id, authorId: john.id });
    postsToInsert.push({ content: 'I actually still use Options API for simple components. It reads better sometimes for beginners.', threadId: compApiThread.id, authorId: somsak.id });
    postsToInsert.push({ content: '`<script setup>` + macros is the way to go today! No more `return {}` boilerplate.', threadId: compApiThread.id, authorId: admin.id });
  }

  if (rustThread) {
    postsToInsert.push({ content: 'Yes! **Axum** and **Actix** are fantastic. The learning curve is steep but you will never see a null pointer exception again.', threadId: rustThread.id, authorId: alice.id });
    postsToInsert.push({ content: 'Depends. For standard CRUD, Node/Express or Go is much faster to develop in. Use Rust if you need strict performance guarantees.', threadId: rustThread.id, authorId: admin.id });
  }

  if (coffeeThread) {
    postsToInsert.push({ content: 'Try local Thai beans from Chiang Mai. **Doi Chaang** dark roasts are great for standard espresso machines!', threadId: coffeeThread.id, authorId: somsak.id });
    postsToInsert.push({ content: 'Make sure your grinder is good enough! The machine matters less than the grinder for espresso quality.', threadId: coffeeThread.id, authorId: john.id });
  }

  for (const t of createdThreads) {
    if (Math.random() > 0.5) {
      postsToInsert.push({ content: 'Thanks for sharing this info! Very helpful 👍', threadId: t.id, authorId: fan.id });
    }
  }

  if (postsToInsert.length > 0) {
    await db.insert(posts).values(postsToInsert);
  }

  console.log('✅ Mock Database Seeded Successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Failed to seed db:', err);
  process.exit(1);
});
