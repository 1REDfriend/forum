import type { ApiClient } from './client.js';

export class ExtrasApi {
  constructor(private client: ApiClient) {}

  // Tags
  listTags(q = '') {
    return this.client.get<{ tags: { id: string; slug: string; label: string }[] }>(
      `/tags?q=${encodeURIComponent(q)}`,
    );
  }

  // Reactions
  toggleReaction(body: { emoji: string; threadId?: string; postId?: string }) {
    return this.client.post('/reactions', body);
  }

  // Watch
  getWatch(threadId: string) {
    return this.client.get<{ watching: boolean }>(`/threads/${threadId}/watch`);
  }
  watch(threadId: string) {
    return this.client.post<{ watching: boolean }>(`/threads/${threadId}/watch`);
  }
  unwatch(threadId: string) {
    return this.client.delete<{ watching: boolean }>(`/threads/${threadId}/watch`);
  }

  // Polls
  getPoll(threadId: string) {
    return this.client.get<any>(`/polls/thread/${threadId}`);
  }
  votePoll(pollId: string, optionId: string) {
    return this.client.post(`/polls/${pollId}/vote`, { optionId });
  }

  // Accept answer
  acceptPost(postId: string) {
    return this.client.post(`/posts/${postId}/accept`);
  }

  // DM
  listConversations() {
    return this.client.get<{ conversations: any[] }>('/dm');
  }
  dmUnread() {
    return this.client.get<{ count: number }>('/dm/unread-count');
  }
  openDm(userId: string) {
    return this.client.post<{ id: string; other: any }>('/dm/open', { userId });
  }
  listMessages(conversationId: string, page = 1) {
    return this.client.get<{ data: any[] }>(`/dm/${conversationId}/messages?page=${page}`);
  }
  sendMessage(conversationId: string, body: string) {
    return this.client.post(`/dm/${conversationId}/messages`, { body });
  }

  // E2EE key bundles (server stores public + wrapped private only)
  getMyCryptoKeys() {
    return this.client.get<{
      keys: {
        userId: string;
        salt: string;
        identityPublicKey: string;
        agreementPublicKey: string;
        wrappedPrivateKeys: string;
        wrapIv: string;
        updatedAt?: string;
      } | null;
    }>('/crypto/keys/me');
  }
  putMyCryptoKeys(body: {
    salt: string;
    identityPublicKey: string;
    agreementPublicKey: string;
    wrappedPrivateKeys: string;
    wrapIv: string;
  }) {
    return this.client.put<{ keys: unknown }>('/crypto/keys/me', body);
  }
  getPublicCryptoKeys(userId: string) {
    return this.client.get<{
      keys: {
        userId: string;
        identityPublicKey: string;
        agreementPublicKey: string;
      } | null;
    }>(`/crypto/keys/${userId}`);
  }

  // Events
  listEvents(from?: string, to?: string) {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    return this.client.get<{ events: any[] }>(`/events?${q.toString()}`);
  }
  createEvent(data: { title: string; description?: string; startsAt: string; endsAt?: string }) {
    return this.client.post('/events', data);
  }

  // Moderators
  listMods(forumId: string) {
    return this.client.get<{ moderators: any[] }>(`/moderators/forum/${forumId}`);
  }
  addMod(forumId: string, userId: string) {
    return this.client.post(`/moderators/forum/${forumId}`, { userId });
  }
  removeMod(forumId: string, userId: string) {
    return this.client.delete(`/moderators/forum/${forumId}/${userId}`);
  }
}
