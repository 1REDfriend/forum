import { eq, or, ilike, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { forums, threads, users } from '../db/schema.js';
export class SearchRepository {
    async search(query, limit = 20) {
        const pattern = `%${query}%`;
        const forumResults = await db.select({
            id: forums.id,
            name: forums.name,
            description: forums.description,
            type: sql `'forum'`,
        }).from(forums)
            .where(or(ilike(forums.name, pattern), ilike(forums.description, pattern)))
            .limit(limit);
        const threadResults = await db.select({
            id: threads.id,
            title: threads.title,
            content: threads.content,
            authorName: users.name,
            forumName: forums.name,
            forumId: forums.id,
            type: sql `'thread'`,
        }).from(threads)
            .innerJoin(users, eq(threads.authorId, users.id))
            .innerJoin(forums, eq(threads.forumId, forums.id))
            .where(or(ilike(threads.title, pattern), ilike(threads.content, pattern)))
            .limit(limit);
        return { forums: forumResults, threads: threadResults };
    }
}
export const searchRepository = new SearchRepository();
//# sourceMappingURL=search.repository.js.map