import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pollOptions, pollVotes, polls } from '../db/schema.js';
import { newId } from '../db/ids.js';

export class PollRepository {
  async create(threadId: string, question: string, options: string[], closesAt?: Date | null) {
    const [poll] = await db
      .insert(polls)
      .values({
        id: newId(),
        threadId,
        question,
        closesAt: closesAt ?? null,
      })
      .returning();
    const opts = [];
    for (let i = 0; i < options.length; i++) {
      const [o] = await db
        .insert(pollOptions)
        .values({ id: newId(), pollId: poll!.id, label: options[i]!, sortOrder: i })
        .returning();
      opts.push(o!);
    }
    return { poll: poll!, options: opts };
  }

  async findByThreadId(threadId: string) {
    const [poll] = await db.select().from(polls).where(eq(polls.threadId, threadId)).limit(1);
    if (!poll) return null;
    const options = await db
      .select({
        id: pollOptions.id,
        label: pollOptions.label,
        sortOrder: pollOptions.sortOrder,
        votes: sql<number>`(SELECT COUNT(*) FROM poll_votes WHERE poll_votes.option_id = poll_options.id)::int`,
      })
      .from(pollOptions)
      .where(eq(pollOptions.pollId, poll.id))
      .orderBy(asc(pollOptions.sortOrder));
    return { poll, options };
  }

  async vote(pollId: string, optionId: string, userId: string) {
    // one vote per user per poll — upsert by delete+insert
    await db.delete(pollVotes).where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));
    await db.insert(pollVotes).values({ id: newId(), pollId, optionId, userId });
  }

  async userVote(pollId: string, userId: string) {
    const [row] = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
      .limit(1);
    return row ?? null;
  }
}

export const pollRepository = new PollRepository();
