import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, SortOrder } from 'mongoose';
import { Ranking, RankingDocument } from './schemas/ranking.schema.js';
import {
  RankingHistory,
  RankingHistoryDocument,
} from './schemas/ranking-history.schema.js';
import { LeagueFilterDto } from './dto/league-filter.dto.js';

@Injectable()
export class RankingsRepository {
  constructor(
    @InjectModel(Ranking.name)
    private readonly rankingModel: Model<RankingDocument>,
    @InjectModel(RankingHistory.name)
    private readonly rankingHistoryModel: Model<RankingHistoryDocument>,
  ) {}

  async findAll(
    filter: LeagueFilterDto,
  ): Promise<{ data: RankingDocument[]; total: number }> {
    const query: FilterQuery<RankingDocument> = {
      league: filter.league,
      mode: filter.mode,
    };

    if (filter.role) {
      query.role = filter.role;
    }

    const sortField = filter.sort || 'rank';
    const sortMap: Record<string, Record<string, SortOrder>> = {
      metaRelevance: { rank: 1 },
      dps: { dps: -1 },
      tdo: { tdo: -1 },
      movesetEfficiency: { movesetEfficiency: -1 },
      rank: { rank: 1 },
    };
    const sort = sortMap[sortField] || { rank: 1 };

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.rankingModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
      this.rankingModel.countDocuments(query),
    ]);

    return { data: data as unknown as RankingDocument[], total };
  }

  async findByPokemonId(
    pokemonId: number,
    league: string,
    mode: string,
  ): Promise<RankingDocument | null> {
    return this.rankingModel
      .findOne({ pokemonId, league, mode })
      .lean() as Promise<RankingDocument | null>;
  }

  async getHistory(
    pokemonId: number,
    league: string,
    mode: string,
  ): Promise<RankingHistoryDocument[]> {
    const rows = await this.rankingHistoryModel
      .find({ pokemonId, league, mode })
      .sort({ snapshotDate: -1 })
      .limit(30)
      .lean()
      .exec();
    return rows as unknown as RankingHistoryDocument[];
  }
}
