import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HistoryRepository } from './history.repository.js';
import {
  HistoryEntryDto,
  HistoryDetailDto,
  HistoryStatsDto,
  HistoryFilterDto,
  TrendPointDto,
  SavedTeamDto,
  TeamMemberDto,
} from './dto/history.dto.js';
import { Pokemon, PokemonDocument } from '../pokedex/schemas/pokemon.schema.js';
import { Ranking, RankingDocument } from '../rankings/schemas/ranking.schema.js';
import { RaidBoss, RaidBossDocument } from '../raids/schemas/raid-boss.schema.js';
import { RaidQueue, RaidQueueDocument } from '../raids/schemas/raid-queue.schema.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

@Injectable()
export class HistoryService {
  constructor(
    private readonly historyRepository: HistoryRepository,
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<PokemonDocument>,
    @InjectModel(Ranking.name)
    private readonly rankingModel: Model<RankingDocument>,
    @InjectModel(RaidBoss.name)
    private readonly raidBossModel: Model<RaidBossDocument>,
    @InjectModel(RaidQueue.name)
    private readonly raidQueueModel: Model<RaidQueueDocument>,
  ) {}

  async findByUser(
    userId: string,
    filter: HistoryFilterDto,
  ): Promise<{
    data: HistoryEntryDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const { data, total } = await this.historyRepository.findByUser(
      userId,
      page,
      limit,
      filter.tier,
      filter.league,
    );

    return {
      data: data.map((e) => this.toDto(e)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats(userId: string): Promise<HistoryStatsDto> {
    const oid = new Types.ObjectId(userId);
    const [pokemonCount, teamsCount, teams] = await Promise.all([
      this.historyRepository.countByUser(userId),
      this.raidQueueModel.countDocuments({ userId: oid }),
      this.raidQueueModel.find({ userId: oid }).lean().exec(),
    ]);

    const totalMembers = teams.reduce((sum: number, t: any) => sum + (t.pokemonIds?.length ?? 0), 0);
    const avgTeamSize = teamsCount > 0 ? +(totalMembers / teamsCount).toFixed(1) : 0;

    return { teamsCount, pokemonCount, avgTeamSize };
  }

  async getDetail(userId: string, entryId: string): Promise<HistoryDetailDto> {
    const entry = await this.historyRepository.findById(userId, entryId);
    if (!entry) {
      throw new NotFoundException({
        message: 'History entry not found',
        code: ERROR_CODES.HISTORY_ENTRY_NOT_FOUND,
      });
    }

    const trend = await this.historyRepository.findTrend(userId, entry.pokemonId);
    const trendPoints: TrendPointDto[] = trend
      .filter((e) => e.metaRank != null)
      .map((e) => ({
        date: e.analyzedAt.toISOString(),
        rank: e.metaRank!,
      }));

    const notes = (entry as any).notes ?? [];
    if (notes.length === 0) {
      const ranking = await this.rankingModel
        .findOne({ pokemonId: entry.pokemonId, league: entry.league || 'great', mode: 'pvp' })
        .lean()
        .exec();
      if (ranking) {
        if ((ranking as any).rank <= 50) notes.push('Strong in current meta');
        if (trendPoints.length >= 2) {
          const delta = trendPoints[trendPoints.length - 1].rank - trendPoints[0].rank;
          if (delta !== 0) {
            notes.push(`Move set Rebalance Impact: ${delta > 0 ? '+' : ''}${delta} ranks`);
          }
        }
      }
    }

    return {
      ...this.toDto(entry),
      ivBreakdown: {
        attack: (entry as any).ivAtk ?? 15,
        defense: (entry as any).ivDef ?? 15,
        hp: (entry as any).ivSta ?? 15,
      },
      rankTrend: trendPoints,
      notes,
    };
  }

  async getTrend(userId: string, pokemonId: number): Promise<TrendPointDto[]> {
    const entries = await this.historyRepository.findTrend(userId, pokemonId);
    return entries
      .filter((e) => e.metaRank != null)
      .map((e) => ({
        date: e.analyzedAt.toISOString(),
        rank: e.metaRank!,
      }));
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    const deleted = await this.historyRepository.softDelete(userId, entryId);
    if (!deleted) {
      throw new NotFoundException({
        message: 'History entry not found',
        code: ERROR_CODES.HISTORY_ENTRY_NOT_FOUND,
      });
    }
  }

  async exportHistory(userId: string): Promise<HistoryEntryDto[]> {
    const entries = await this.historyRepository.exportAll(userId);
    return entries.map((e) => this.toDto(e));
  }

  async getSavedTeams(userId: string): Promise<SavedTeamDto[]> {
    const queues = await this.raidQueueModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (queues.length === 0) return [];

    const bossIds = [...new Set(queues.map((q: any) => q.raidBossId.toString()))];
    const bosses = await this.raidBossModel
      .find({ _id: { $in: bossIds.map((id) => new Types.ObjectId(id)) } })
      .lean()
      .exec();
    const bossMap = new Map(bosses.map((b: any) => [b._id.toString(), b]));

    const allPokemonIds = [...new Set(queues.flatMap((q: any) => q.pokemonIds))];
    const pokemonDocs = await this.pokemonModel
      .find({ pokemonId: { $in: allPokemonIds } })
      .lean()
      .exec();
    const pMap = new Map(pokemonDocs.map((p: any) => [p.pokemonId, p]));

    return queues.map((q: any) => {
      const boss = bossMap.get(q.raidBossId.toString());
      const members: TeamMemberDto[] = (q.pokemonIds ?? []).map((pid: number) => {
        const p = pMap.get(pid);
        return {
          pokemonId: pid,
          name: p?.name ?? `#${pid}`,
          types: p?.types,
          spriteUrl: p?.spriteUrl,
        };
      });

      return {
        id: q._id.toString(),
        bossName: boss?.pokemonName ?? 'Unknown Boss',
        bossId: q.raidBossId.toString(),
        pokemonCount: members.length,
        members,
        createdAt: q.createdAt?.toISOString() ?? new Date().toISOString(),
      };
    });
  }

  async logAnalysis(
    userId: string,
    pokemonId: number,
    pokemonName: string,
    league: string,
    metaRank?: number,
    ivPercent?: number,
    ivAtk?: number,
    ivDef?: number,
    ivSta?: number,
  ): Promise<void> {
    const pokemon = await this.pokemonModel
      .findOne({ pokemonId })
      .lean()
      .exec();
    const ranking = await this.rankingModel
      .findOne({ pokemonId, league: league || 'great', mode: 'pvp' })
      .lean()
      .exec();

    const tier = this.rankToTier(metaRank ?? (ranking as any)?.rank);

    await this.historyRepository.create({
      userId: new Types.ObjectId(userId),
      pokemonId,
      pokemonName: pokemonName || pokemon?.name,
      pokemonTypes: pokemon?.types,
      spriteUrl: (pokemon as any)?.spriteUrl,
      league,
      metaRank: metaRank ?? (ranking as any)?.rank,
      ivPercent,
      ivAtk: ivAtk ?? 15,
      ivDef: ivDef ?? 15,
      ivSta: ivSta ?? 15,
      cp: (ranking as any)?.tdo ? Math.round((ranking as any).tdo * 0.5) : undefined,
      dps: (ranking as any)?.dps,
      tdo: (ranking as any)?.tdo,
      tier,
      analyzedAt: new Date(),
    });
  }

  private rankToTier(rank?: number): string {
    if (!rank) return 'D';
    if (rank <= 20) return 'S';
    if (rank <= 50) return 'A';
    if (rank <= 100) return 'B';
    if (rank <= 200) return 'C';
    return 'D';
  }

  private toDto(entry: any): HistoryEntryDto {
    const ivAtk = entry.ivAtk ?? 15;
    const ivDef = entry.ivDef ?? 15;
    const ivSta = entry.ivSta ?? 15;

    return {
      id: entry._id.toString(),
      pokemonId: entry.pokemonId,
      pokemonName: entry.pokemonName,
      pokemonTypes: entry.pokemonTypes,
      spriteUrl: entry.spriteUrl,
      league: entry.league,
      metaRank: entry.metaRank,
      tier: entry.tier ?? this.rankToTier(entry.metaRank),
      ivPercent: entry.ivPercent,
      ivSpread: `${ivAtk}/${ivDef}/${ivSta}`,
      cp: entry.cp,
      dps: entry.dps,
      tdo: entry.tdo,
      analyzedAt: entry.analyzedAt?.toISOString?.() ?? entry.analyzedAt,
    };
  }
}
