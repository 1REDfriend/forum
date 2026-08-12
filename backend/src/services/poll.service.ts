import { pollRepository } from '../repositories/poll.repository.js';
import { threadRepository } from '../repositories/thread.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';

export class PollService {
  async getForThread(threadId: string, userId?: string) {
    const data = await pollRepository.findByThreadId(threadId);
    if (!data) return null;
    const vote = userId ? await pollRepository.userVote(data.poll.id, userId) : null;
    return {
      id: data.poll.id,
      question: data.poll.question,
      closesAt: data.poll.closesAt,
      options: data.options,
      myOptionId: vote?.optionId ?? null,
      closed: data.poll.closesAt ? data.poll.closesAt.getTime() < Date.now() : false,
    };
  }

  async vote(userId: string, pollId: string, optionId: string) {
    // find poll via options path — load by scanning thread would be heavier; trust option belongs
    const threadIdGuess = await this.findThreadForPoll(pollId);
    if (!threadIdGuess) throw NotFoundError('Poll not found');
    const full = await pollRepository.findByThreadId(threadIdGuess);
    if (!full || full.poll.id !== pollId) throw NotFoundError('Poll not found');
    if (full.poll.closesAt && full.poll.closesAt.getTime() < Date.now()) {
      throw ForbiddenError('Poll is closed');
    }
    if (!full.options.some((o) => o.id === optionId)) {
      throw BadRequestError('Invalid option');
    }
    await pollRepository.vote(pollId, optionId, userId);
    return this.getForThread(threadIdGuess, userId);
  }

  private async findThreadForPoll(pollId: string): Promise<string | null> {
    const { db } = await import('../db/index.js');
    const { polls } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const [row] = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1);
    return row?.threadId ?? null;
  }
}

export const pollService = new PollService();
