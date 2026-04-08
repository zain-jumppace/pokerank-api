import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  HistoryEntry,
  HistoryEntryDocument,
} from './schemas/history-entry.schema.js';

@Injectable()
export class HistoryRepository {
  constructor(
    @InjectModel(HistoryEntry.name)
    private readonly historyModel: Model<HistoryEntryDocument>,
  ) {}

  async findByUser(
    userId: string,
    page: number,
    limit: number,
    tier?: string,
    league?: string,
  ): Promise<{ data: HistoryEntryDocument[]; total: number }> {
    const query: any = { userId: new Types.ObjectId(userId), deletedAt: null };
    if (tier) query.tier = tier;
    if (league) query.league = league.toLowerCase();

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.historyModel
        .find(query)
        .sort({ analyzedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.historyModel.countDocuments(query),
    ]);

    return { data: data as unknown as HistoryEntryDocument[], total };
  }

  async findById(
    userId: string,
    entryId: string,
  ): Promise<HistoryEntryDocument | null> {
    return this.historyModel
      .findOne({
        _id: new Types.ObjectId(entryId),
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .lean()
      .exec() as unknown as Promise<HistoryEntryDocument | null>;
  }

  async countByUser(userId: string): Promise<number> {
    return this.historyModel.countDocuments({
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });
  }

  async findTrend(
    userId: string,
    pokemonId: number,
  ): Promise<HistoryEntryDocument[]> {
    return this.historyModel
      .find({
        userId: new Types.ObjectId(userId),
        pokemonId,
        deletedAt: null,
      })
      .sort({ analyzedAt: 1 })
      .lean()
      .exec() as unknown as Promise<HistoryEntryDocument[]>;
  }

  async softDelete(userId: string, entryId: string): Promise<boolean> {
    const result = await this.historyModel.updateOne(
      { _id: new Types.ObjectId(entryId), userId: new Types.ObjectId(userId) },
      { deletedAt: new Date() },
    );
    return result.modifiedCount > 0;
  }

  async exportAll(userId: string): Promise<HistoryEntryDocument[]> {
    return this.historyModel
      .find({ userId: new Types.ObjectId(userId), deletedAt: null })
      .sort({ analyzedAt: -1 })
      .lean()
      .exec() as unknown as Promise<HistoryEntryDocument[]>;
  }

  create(entry: Partial<HistoryEntry>): Promise<HistoryEntryDocument> {
    return this.historyModel.create(entry) as unknown as Promise<HistoryEntryDocument>;
  }
}
