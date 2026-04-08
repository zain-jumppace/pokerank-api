import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { GameEvent, EventDocument } from './schemas/event.schema.js';
import {
  EventAuditLog,
  EventAuditLogDocument,
} from './schemas/event-audit-log.schema.js';
import { EventFilterDto } from './dto/event-filter.dto.js';

@Injectable()
export class EventsRepository {
  constructor(
    @InjectModel(GameEvent.name)
    private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventAuditLog.name)
    private readonly auditLogModel: Model<EventAuditLogDocument>,
  ) {}

  async findPublic(
    filter: EventFilterDto,
  ): Promise<{ data: EventDocument[]; total: number }> {
    const now = new Date();
    const query: FilterQuery<EventDocument> = { visibility: 'live' };

    if (filter.status === 'active') {
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (filter.status === 'upcoming') {
      query.startDate = { $gt: now };
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.eventModel
        .find(query)
        .sort({ priority: -1, startDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.eventModel.countDocuments(query),
    ]);

    return { data: data as unknown as EventDocument[], total };
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: EventDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.eventModel
        .find()
        .sort({ priority: -1, startDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.eventModel.countDocuments(),
    ]);
    return { data: data as unknown as EventDocument[], total };
  }

  async findById(id: string): Promise<EventDocument | null> {
    return this.eventModel.findById(id).lean() as Promise<EventDocument | null>;
  }

  create(data: Partial<GameEvent>): Promise<EventDocument> {
    return this.eventModel.create(data) as unknown as Promise<EventDocument>;
  }

  async update(
    id: string,
    data: Partial<GameEvent>,
  ): Promise<EventDocument | null> {
    return this.eventModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean() as Promise<EventDocument | null>;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.eventModel.deleteOne({
      _id: new Types.ObjectId(id),
    });
    return result.deletedCount > 0;
  }

  async createAuditLog(log: Partial<EventAuditLog>): Promise<void> {
    await this.auditLogModel.create(log);
  }

  async getAuditLogs(eventId: string): Promise<EventAuditLogDocument[]> {
    const rows = await this.auditLogModel
      .find({ eventId: new Types.ObjectId(eventId) })
      .sort({ createdAt: -1 })
      .lean();
    return rows as unknown as EventAuditLogDocument[];
  }
}
