import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RankingsRepository } from './rankings.repository.js';
import { LeagueFilterDto } from './dto/league-filter.dto.js';
import {
  RankingEntryDto,
  RankingDetailDto,
  RankingTrendPointDto,
  CounterDto,
  MovesetEffectivenessDto,
} from './dto/ranking-entry.dto.js';
import { Pokemon, PokemonDocument } from '../pokedex/schemas/pokemon.schema.js';
import { PokemonMove, PokemonMoveDocument } from '../pokedex/schemas/pokemon-move.schema.js';
import { Move, MoveDocument } from '../pokedex/schemas/move.schema.js';
import { Ranking, RankingDocument } from './schemas/ranking.schema.js';
import { WEAK_TO } from '../../common/constants/type-chart.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

@Injectable()
export class RankingsService {
  constructor(
    private readonly rankingsRepository: RankingsRepository,
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<PokemonDocument>,
    @InjectModel(PokemonMove.name)
    private readonly pokemonMoveModel: Model<PokemonMoveDocument>,
    @InjectModel(Move.name)
    private readonly moveModel: Model<MoveDocument>,
    @InjectModel(Ranking.name)
    private readonly rankingModel: Model<RankingDocument>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async findAll(filter: LeagueFilterDto): Promise<{
    data: RankingEntryDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const cacheKey = `rankings:v2:${filter.league}:${filter.mode}:${filter.sort || 'rank'}:${filter.role || 'all'}:${page}:${limit}`;

    const cached = await this.cacheManager.get<{
      data: RankingEntryDto[];
      meta: any;
    }>(cacheKey);
    if (cached) return cached;

    const { data, total } = await this.rankingsRepository.findAll(filter);

    const pokemonIds = data.map((r) => r.pokemonId);
    const [pokemonDocs, movePairs] = await Promise.all([
      this.pokemonModel.find({ pokemonId: { $in: pokemonIds } }).lean().exec(),
      this.getBestMovesets(pokemonIds),
    ]);
    const pokemonMap = new Map(pokemonDocs.map((p: any) => [p.pokemonId, p]));

    const result = {
      data: data.map((r): RankingEntryDto => {
        const p = pokemonMap.get(r.pokemonId);
        return {
          pokemonId: r.pokemonId,
          pokemonName: r.pokemonName ?? p?.name,
          pokemonTypes: r.pokemonTypes ?? p?.types,
          spriteUrl: p?.spriteUrl,
          league: r.league,
          mode: r.mode,
          rank: r.rank,
          dps: r.dps,
          tdo: r.tdo,
          statProduct: r.statProduct,
          movesetEfficiency: r.movesetEfficiency,
          role: r.role,
          bestMoveset: movePairs.get(r.pokemonId) || undefined,
          bestSpread: '15/15/15',
        };
      }),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await this.cacheManager.set(cacheKey, result, 3600);
    return result;
  }

  async findByPokemonId(
    pokemonId: number,
    league: string,
    mode: string,
  ): Promise<RankingDetailDto> {
    const cacheKey = `ranking:detail:v2:${pokemonId}:${league}:${mode}`;
    const cached = await this.cacheManager.get<RankingDetailDto>(cacheKey);
    if (cached) return cached;

    const ranking = await this.rankingsRepository.findByPokemonId(
      pokemonId,
      league,
      mode,
    );
    if (!ranking) {
      throw new NotFoundException({
        message: `Ranking not found for Pokémon ${pokemonId} in ${league} ${mode}`,
        code: ERROR_CODES.POKEMON_NOT_FOUND,
      });
    }

    const [pokemon, history, overallRank, movePairs] = await Promise.all([
      this.pokemonModel.findOne({ pokemonId }).lean().exec(),
      this.rankingsRepository.getHistory(pokemonId, league, mode),
      this.rankingModel
        .countDocuments({ league, mode, rank: { $lte: ranking.rank } })
        .exec(),
      this.getBestMovesets([pokemonId]),
    ]);

    const typeRank = await this.computeTypeRank(pokemonId, league, mode, ranking.pokemonTypes || pokemon?.types || []);
    const topCounters = await this.getTopCounters(pokemon?.types || ranking.pokemonTypes || [], league, mode);
    const movesetEffectiveness = await this.getMovesetEffectiveness(pokemonId);
    const rankingTrends = this.buildRankingTrends(ranking.rank, history);

    const detail: RankingDetailDto = {
      pokemonId: ranking.pokemonId,
      pokemonName: ranking.pokemonName ?? pokemon?.name,
      pokemonTypes: ranking.pokemonTypes ?? pokemon?.types,
      spriteUrl: (pokemon as any)?.spriteUrl,
      league: ranking.league,
      mode: ranking.mode,
      rank: ranking.rank,
      dps: ranking.dps,
      tdo: ranking.tdo,
      statProduct: ranking.statProduct,
      movesetEfficiency: ranking.movesetEfficiency,
      role: ranking.role,
      bestMoveset: movePairs.get(pokemonId) || undefined,
      bestSpread: '15/15/15',
      overallRank: overallRank,
      typeRank,
      damagePerSecond: ranking.dps,
      totalDamageOutput: ranking.tdo,
      bestIvSpread: '15/15/15',
      rankingTrends,
      topCounters,
      movesetEffectiveness,
    };

    await this.cacheManager.set(cacheKey, detail, 3600);
    return detail;
  }

  private buildRankingTrends(currentRank: number, history: any[]): RankingTrendPointDto[] {
    const labels = ['Current', '3 Months ago', '6 Months ago', '9 Months ago', '1 year ago'];
    const sortedHistory = [...history].sort(
      (a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime(),
    );

    const points: RankingTrendPointDto[] = [
      { label: labels[0], rank: currentRank },
    ];

    for (let i = 1; i < labels.length && i - 1 < sortedHistory.length; i++) {
      const prevRank = points[points.length - 1].rank;
      const histRank = sortedHistory[i - 1]?.rank ?? currentRank;
      points.push({
        label: labels[i],
        rank: histRank,
        delta: prevRank - histRank,
      });
    }

    return points;
  }

  private async computeTypeRank(
    pokemonId: number,
    league: string,
    mode: string,
    types: string[],
  ): Promise<number> {
    if (!types.length) return 0;
    const primaryType = types[0];

    const sameTypeRankings = await this.rankingModel
      .find({ league, mode, pokemonTypes: primaryType })
      .sort({ rank: 1 })
      .lean()
      .exec();

    const idx = sameTypeRankings.findIndex((r: any) => r.pokemonId === pokemonId);
    return idx >= 0 ? idx + 1 : 0;
  }

  private async getTopCounters(
    types: string[],
    league: string,
    mode: string,
  ): Promise<CounterDto[]> {
    const effectiveTypes = new Set<string>();
    for (const t of types) {
      const lc = t.toLowerCase();
      for (const attacker of WEAK_TO[lc] || []) {
        effectiveTypes.add(attacker);
      }
    }

    if (effectiveTypes.size === 0) return [];

    const counterRankings = await this.rankingModel
      .find({
        league,
        mode,
        pokemonTypes: { $in: [...effectiveTypes] },
      })
      .sort({ rank: 1 })
      .limit(10)
      .lean()
      .exec();

    const counterIds = counterRankings.map((r: any) => r.pokemonId);
    const counterPokemon = await this.pokemonModel
      .find({ pokemonId: { $in: counterIds } })
      .lean()
      .exec();
    const pMap = new Map(counterPokemon.map((p: any) => [p.pokemonId, p]));

    const seen = new Set<number>();
    const result: CounterDto[] = [];
    for (const r of counterRankings) {
      if (seen.has(r.pokemonId) || result.length >= 3) continue;
      seen.add(r.pokemonId);
      const p = pMap.get(r.pokemonId);
      result.push({
        pokemonId: r.pokemonId,
        name: p?.name ?? r.pokemonName ?? `#${r.pokemonId}`,
        spriteUrl: p?.spriteUrl,
      });
    }

    return result;
  }

  private async getMovesetEffectiveness(pokemonId: number): Promise<MovesetEffectivenessDto[]> {
    const pokemonMoves = await this.pokemonMoveModel.find({ pokemonId }).lean().exec();
    const moveIds = pokemonMoves.map((pm: any) => pm.moveId);
    const moves = await this.moveModel.find({ moveId: { $in: moveIds } }).lean().exec();
    const moveMap = new Map(moves.map((m: any) => [m.moveId, m]));

    const fastMoves = pokemonMoves
      .filter((pm: any) => pm.moveSlot === 'fast')
      .map((pm: any) => moveMap.get(pm.moveId))
      .filter(Boolean);
    const chargeMoves = pokemonMoves
      .filter((pm: any) => pm.moveSlot !== 'fast')
      .map((pm: any) => moveMap.get(pm.moveId))
      .filter(Boolean);

    const combos: MovesetEffectivenessDto[] = [];
    for (const fast of fastMoves) {
      for (const charge of chargeMoves) {
        const fDps = (fast as any).dps ?? (fast as any).power ?? 0;
        const cDps = (charge as any).dps ?? (charge as any).power ?? 0;
        const combined = fDps + cDps;
        const maxPossible = 200;
        const pct = Math.min(100, Math.round((combined / maxPossible) * 100));
        combos.push({
          moveset: `${(fast as any).name} + ${(charge as any).name}`,
          effectiveness: pct,
        });
      }
    }

    return combos.sort((a, b) => b.effectiveness - a.effectiveness).slice(0, 3);
  }

  private async getBestMovesets(pokemonIds: number[]): Promise<Map<number, string>> {
    const allPm = await this.pokemonMoveModel
      .find({ pokemonId: { $in: pokemonIds } })
      .lean()
      .exec();
    const moveIds = [...new Set(allPm.map((pm: any) => pm.moveId))];
    const moves = await this.moveModel
      .find({ moveId: { $in: moveIds } })
      .lean()
      .exec();
    const moveMap = new Map(moves.map((m: any) => [m.moveId, m]));

    const result = new Map<number, string>();
    for (const pkId of pokemonIds) {
      const pms = allPm.filter((pm: any) => pm.pokemonId === pkId);
      const fast = pms
        .filter((pm: any) => pm.moveSlot === 'fast')
        .map((pm: any) => moveMap.get(pm.moveId))
        .filter(Boolean)
        .sort((a: any, b: any) => (b.dps ?? b.power ?? 0) - (a.dps ?? a.power ?? 0))[0];
      const charge = pms
        .filter((pm: any) => pm.moveSlot !== 'fast')
        .map((pm: any) => moveMap.get(pm.moveId))
        .filter(Boolean)
        .sort((a: any, b: any) => (b.dps ?? b.power ?? 0) - (a.dps ?? a.power ?? 0))[0];

      if (fast && charge) {
        result.set(pkId, `${(fast as any).name} · ${(charge as any).name}`);
      }
    }

    return result;
  }
}
