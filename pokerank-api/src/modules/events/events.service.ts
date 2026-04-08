import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Types } from 'mongoose';
import { EventsRepository } from './events.repository.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { EventFilterDto } from './dto/event-filter.dto.js';
import {
  EventResponseDto,
  AuditLogEntryDto,
} from './dto/event-response.dto.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async findPublic(
    filter: EventFilterDto,
  ): Promise<{ data: EventResponseDto[]; meta: any }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const cacheKey = `events:${filter.status || 'all'}:${page}`;

    const cached = await this.cacheManager.get<{
      data: EventResponseDto[];
      meta: any;
    }>(cacheKey);
    if (cached) return cached;

    const { data, total } = await this.eventsRepository.findPublic(filter);
    const result = {
      data: data.map((e) => this.toDto(e)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await this.cacheManager.set(cacheKey, result, 900);
    return result;
  }

  async findById(id: string): Promise<EventResponseDto> {
    const event = await this.eventsRepository.findById(id);
    if (!event) {
      throw new NotFoundException({
        message: 'Event not found',
        code: ERROR_CODES.EVENT_NOT_FOUND,
      });
    }
    return this.toDto(event);
  }

  async findAllAdmin(
    page: number,
    limit: number,
  ): Promise<{ data: EventResponseDto[]; meta: any }> {
    const { data, total } = await this.eventsRepository.findAll(page, limit);
    return {
      data: data.map((e) => this.toDto(e)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(
    dto: CreateEventDto,
    adminUserId: string,
  ): Promise<EventResponseDto> {
    const event = await this.eventsRepository.create({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
    await this.eventsRepository.createAuditLog({
      eventId: event._id,
      adminUserId: new Types.ObjectId(adminUserId),
      action: 'CREATE',
      after: dto as any,
    });
    await this.invalidateCache();
    return this.toDto(event);
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    adminUserId: string,
  ): Promise<EventResponseDto> {
    const before = await this.eventsRepository.findById(id);
    if (!before) {
      throw new NotFoundException({
        message: 'Event not found',
        code: ERROR_CODES.EVENT_NOT_FOUND,
      });
    }

    const updateData: any = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    const updated = await this.eventsRepository.update(id, updateData);
    if (!updated) {
      throw new NotFoundException({
        message: 'Event not found',
        code: ERROR_CODES.EVENT_NOT_FOUND,
      });
    }

    await this.eventsRepository.createAuditLog({
      eventId: new Types.ObjectId(id),
      adminUserId: new Types.ObjectId(adminUserId),
      action: 'UPDATE',
      before: before as any,
      after: dto as any,
    });

    await this.invalidateCache();
    return this.toDto(updated);
  }

  async delete(id: string, adminUserId: string): Promise<void> {
    const event = await this.eventsRepository.findById(id);
    if (!event) {
      throw new NotFoundException({
        message: 'Event not found',
        code: ERROR_CODES.EVENT_NOT_FOUND,
      });
    }

    await this.eventsRepository.delete(id);
    await this.eventsRepository.createAuditLog({
      eventId: new Types.ObjectId(id),
      adminUserId: new Types.ObjectId(adminUserId),
      action: 'DELETE',
      before: event as any,
    });
    await this.invalidateCache();
  }

  async publish(id: string, adminUserId: string): Promise<EventResponseDto> {
    return this.update(
      id,
      { visibility: 'live' } as UpdateEventDto,
      adminUserId,
    );
  }

  async schedule(id: string, adminUserId: string): Promise<EventResponseDto> {
    return this.update(
      id,
      { visibility: 'scheduled' } as UpdateEventDto,
      adminUserId,
    );
  }

  async getAuditLog(eventId: string): Promise<AuditLogEntryDto[]> {
    const logs = await this.eventsRepository.getAuditLogs(eventId);
    return logs.map((l) => ({
      adminUserId: l.adminUserId.toString(),
      action: l.action,
      before: l.before,
      after: l.after,
      timestamp:
        (l as any).createdAt?.toISOString() || new Date().toISOString(),
    }));
  }

  private async invalidateCache(): Promise<void> {
    try {
      const store = (this.cacheManager as any).store;
      if (store && typeof store.keys === 'function') {
        const keys: string[] = await store.keys('events:*');
        for (const key of keys) {
          await this.cacheManager.del(key);
        }
      }
    } catch {
      // Cache invalidation is best-effort
    }
  }

  private toDto(event: any): EventResponseDto {
    return {
      id: event._id.toString(),
      internalId: event.internalId,
      name: event.name,
      description: event.description,
      bannerImageUrl: event.bannerImageUrl,
      bonuses: event.bonuses || [],
      featuredPokemonIds: event.featuredPokemonIds || [],
      startDate:
        event.startDate instanceof Date
          ? event.startDate.toISOString()
          : event.startDate,
      endDate:
        event.endDate instanceof Date
          ? event.endDate.toISOString()
          : event.endDate,
      timezone: event.timezone,
      visibility: event.visibility,
      priority: event.priority || 0,
    };
  }
}
