import { dmRepository } from '../repositories/dm.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { notificationService } from './notification.service.js';
import { realtimeService } from './realtime.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { toPublicMediaUrl } from '../domain/media-url.js';

function publicPeer(other: {
  id: string;
  name: string;
  avatar: string | null;
  banner?: string | null;
  bio?: string | null;
  role: string;
  tier: string;
}) {
  return {
    id: other.id,
    name: other.name,
    avatar: toPublicMediaUrl(other.avatar),
    banner: toPublicMediaUrl(other.banner ?? null),
    bio: other.bio ?? null,
    role: other.role,
    tier: other.tier,
  };
}

export class DmService {
  async list(userId: string) {
    const rows = await dmRepository.listConversations(userId);
    return Promise.all(
      rows.map(async (c) => {
        const otherId = c.userAId === userId ? c.userBId : c.userAId;
        const other = await userRepository.findById(otherId);
        return {
          id: c.id,
          lastMessageAt: c.lastMessageAt,
          other: other ? publicPeer(other) : { id: otherId, name: 'Unknown', avatar: null, banner: null, bio: null, role: 'user', tier: 'wanderer' },
        };
      }),
    );
  }

  async open(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw BadRequestError('Cannot message yourself');
    const other = await userRepository.findById(otherUserId);
    if (!other || other.isBanned) throw NotFoundError('User not found');
    const conv = await dmRepository.getOrCreateConversation(userId, otherUserId);
    return { id: conv.id, other: publicPeer(other) };
  }

  async messages(userId: string, conversationId: string, page = 1, limit = 50) {
    const conv = await dmRepository.findConversation(conversationId);
    if (!conv) throw NotFoundError('Conversation not found');
    if (conv.userAId !== userId && conv.userBId !== userId) {
      throw ForbiddenError('Not a participant');
    }
    await dmRepository.markRead(conversationId, userId);
    const data = await dmRepository.listMessages(conversationId, page, limit);
    return { data: data.reverse(), page, limit };
  }

  async send(userId: string, conversationId: string, body: string) {
    const text = body.trim();
    if (!text) throw BadRequestError('Empty message');
    if (text.length > 16_000) throw BadRequestError('Message too long');
    const conv = await dmRepository.findConversation(conversationId);
    if (!conv) throw NotFoundError('Conversation not found');
    if (conv.userAId !== userId && conv.userBId !== userId) {
      throw ForbiddenError('Not a participant');
    }
    const msg = await dmRepository.sendMessage(conversationId, userId, text);
    const otherId = conv.userAId === userId ? conv.userBId : conv.userAId;
    // Never put E2EE ciphertext or plaintext secrets into notifications.
    const isE2ee = text.startsWith('{') && text.includes('"e2ee"');
    const snippet = isE2ee ? '[ข้อความเข้ารหัส]' : text.slice(0, 120);
    await notificationService.create({
      userId: otherId,
      type: 'mention', // reuse type surface; payload marks dm
      actorId: userId,
      entityType: 'dm',
      entityId: msg.id,
      payload: { dm: true, conversationId, snippet, e2ee: isE2ee },
    });
    realtimeService.publish(otherId, {
      type: 'dm',
      payload: { conversationId, messageId: msg.id },
    });
    return msg;
  }

  async unreadCount(userId: string) {
    return { count: await dmRepository.unreadCount(userId) };
  }
}

export const dmService = new DmService();
