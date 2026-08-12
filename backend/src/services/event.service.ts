import { eventRepository } from '../repositories/event.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { ForbiddenError, BadRequestError } from '../utils/errors.js';

export class EventService {
  async list(from?: string, to?: string) {
    return eventRepository.list(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  async create(
    userId: string,
    data: { title: string; description?: string | undefined; startsAt: string; endsAt?: string | undefined },
  ) {
    const user = await userRepository.findById(userId);
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      throw ForbiddenError('Only managers/admins can create events');
    }
    if (!data.title?.trim()) throw BadRequestError('Title required');
    return eventRepository.create({
      title: data.title.trim(),
      description: data.description ?? null,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      createdBy: userId,
    });
  }

  async remove(userId: string, id: string) {
    const user = await userRepository.findById(userId);
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      throw ForbiddenError('Only managers/admins can delete events');
    }
    await eventRepository.remove(id);
  }
}

export const eventService = new EventService();
