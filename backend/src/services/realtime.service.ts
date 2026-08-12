/**
 * In-process SSE hub: push notification / message events to connected users.
 * Single-node only (fine for radxa/dev); multi-instance would need Redis later.
 */

type Client = {
  userId: string;
  send: (data: string) => void;
};

const clients = new Map<string, Set<Client>>();

export type RealtimeEvent = {
  type: 'notification' | 'dm' | 'thread_post' | 'ping';
  payload?: unknown;
};

export const realtimeService = {
  subscribe(userId: string, send: (data: string) => void): () => void {
    const client: Client = { userId, send };
    let set = clients.get(userId);
    if (!set) {
      set = new Set();
      clients.set(userId, set);
    }
    set.add(client);
    return () => {
      set!.delete(client);
      if (set!.size === 0) clients.delete(userId);
    };
  },

  publish(userId: string, event: RealtimeEvent) {
    const set = clients.get(userId);
    if (!set) return;
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const c of set) {
      try {
        c.send(data);
      } catch {
        /* drop broken client */
      }
    }
  },

  publishMany(userIds: string[], event: RealtimeEvent) {
    const seen = new Set<string>();
    for (const id of userIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      this.publish(id, event);
    }
  },
};
