import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RaidBoss, RaidBossDocument } from './schemas/raid-boss.schema.js';
import { RaidQueue, RaidQueueDocument } from './schemas/raid-queue.schema.js';
import {
  RaidBossListDto,
  RaidBossDetailDto,
  IdealCounterDto,
  PotentialFormDto,
  SuggestedTeamMemberDto,
} from './dto/raid-boss.dto.js';
import {
  RaidQueueDto,
  CreateRaidQueueDto,
} from './dto/create-raid-queue.dto.js';
import { Pokemon, PokemonDocument } from '../pokedex/schemas/pokemon.schema.js';
import { Ranking, RankingDocument } from '../rankings/schemas/ranking.schema.js';
import { Move, MoveDocument } from '../pokedex/schemas/move.schema.js';
import { PokemonMove, PokemonMoveDocument } from '../pokedex/schemas/pokemon-move.schema.js';
import { Evolution, EvolutionDocument } from '../pokedex/schemas/evolution.schema.js';
import { WEAK_TO } from '../../common/constants/type-chart.js';
import { getTypeEffectiveness } from '../../common/constants/type-chart.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

const CPM_20 = 0.5974;
const CPM_25 = 0.667934; // weather boosted

@Injectable()
export class RaidsService {
  constructor(
    @InjectModel(RaidBoss.name)
    private readonly raidBossModel: Model<RaidBossDocument>,
    @InjectModel(RaidQueue.name)
    private readonly raidQueueModel: Model<RaidQueueDocument>,
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<PokemonDocument>,
    @InjectModel(Ranking.name)
    private readonly rankingModel: Model<RankingDocument>,
    @InjectModel(Move.name)
    private readonly moveModel: Model<MoveDocument>,
    @InjectModel(PokemonMove.name)
    private readonly pokemonMoveModel: Model<PokemonMoveDocument>,
    @InjectModel(Evolution.name)
    private readonly evolutionModel: Model<EvolutionDocument>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async findActiveBosses(): Promise<RaidBossListDto[]> {
    const cacheKey = 'raids:active:v3';
    const cached = await this.cacheManager.get<RaidBossListDto[]>(cacheKey);
    if (cached) return cached;

    const bosses = await this.raidBossModel.find({ isActive: true }).lean();
    const pokemonIds = bosses.map((b) => b.pokemonId);

    const [pokemonDocs, rankings, evolutions] = await Promise.all([
      this.pokemonModel.find({ pokemonId: { $in: pokemonIds } }).lean().exec(),
      this.rankingModel.find({ pokemonId: { $in: pokemonIds }, league: 'master', mode: 'pvp' }).lean().exec(),
      this.evolutionModel.find({ $or: [{ fromPokemonId: { $in: pokemonIds } }, { toPokemonId: { $in: pokemonIds } }] }).lean().exec(),
    ]);

    const pMap = new Map(pokemonDocs.map((p: any) => [p.pokemonId, p]));
    const rMap = new Map(rankings.map((r: any) => [r.pokemonId, r]));

    const result: RaidBossListDto[] = bosses.map((b) => {
      const p = pMap.get(b.pokemonId);
      const r = rMap.get(b.pokemonId);
      const types = b.pokemonTypes ?? p?.types ?? [];
      const te = getTypeEffectiveness(types);

      const hasEvo = evolutions.some(
        (e: any) => e.fromPokemonId === b.pokemonId,
      );
      const evoLabel = (b.potentialForms && b.potentialForms.length > 0)
        ? b.potentialForms[0]
        : hasEvo ? 'Has Evolution' : 'Non';

      return {
        id: b._id.toString(),
        pokemonId: b.pokemonId,
        pokemonName: b.pokemonName,
        pokemonTypes: types,
        tier: b.tier,
        starRating: this.tierToStars(b.tier),
        isActive: b.isActive,
        cp: b.cp,
        spriteUrl: p?.spriteUrl,
        weaknesses: te.weakTo,
        dps: r?.dps ?? this.estimateDps(p),
        tdo: r?.tdo ?? this.estimateTdo(p),
        ivSpread: '15/15/15',
        league: b.tier === 5 ? 'Master League' : b.tier === 3 ? 'Ultra League' : 'Great League',
        evolutions: evoLabel,
      };
    });

    await this.cacheManager.set(cacheKey, result, 1800);
    return result;
  }

  async findBossById(bossId: string): Promise<RaidBossDetailDto> {
    const cacheKey = `raid:detail:v3:${bossId}`;
    const cached = await this.cacheManager.get<RaidBossDetailDto>(cacheKey);
    if (cached) return cached;

    const boss = await this.raidBossModel.findById(bossId).lean();
    if (!boss) {
      throw new NotFoundException({
        message: 'Raid boss not found',
        code: ERROR_CODES.RAID_BOSS_NOT_FOUND,
      });
    }

    const pokemon = await this.pokemonModel
      .findOne({ pokemonId: boss.pokemonId })
      .lean()
      .exec();

    const types = boss.pokemonTypes ?? pokemon?.types ?? [];
    const te = getTypeEffectiveness(types);

    const catchCp = boss.catchCp ?? this.calc100IvCatchCp(pokemon, CPM_20);
    const weatherBoostedCatchCp = boss.weatherBoostedCatchCp ?? this.calc100IvCatchCp(pokemon, CPM_25);

    const [ranking, typeRanking] = await Promise.all([
      this.rankingModel.findOne({ pokemonId: boss.pokemonId, league: 'master', mode: 'pvp' }).lean().exec(),
      this.computeTypeRank(boss.pokemonId, types),
    ]);

    const league = boss.tier === 5 ? 'Master League' : boss.tier === 3 ? 'Ultra League' : 'Great League';

    const potentialForms = await this.buildPotentialForms(boss, pokemon);

    const quickMoves = boss.quickMoves ?? [];
    const chargedMoves = boss.chargedMoves ?? [];
    if (quickMoves.length === 0 || chargedMoves.length === 0) {
      const dbMoves = await this.loadBossMoves(boss.pokemonId);
      if (quickMoves.length === 0) quickMoves.push(...dbMoves.quick);
      if (chargedMoves.length === 0) chargedMoves.push(...dbMoves.charged);
    }

    const idealCounters = await this.computeIdealCounters(types);
    const suggestedTeam = idealCounters.slice(0, 3).map((c) => ({
      pokemonId: c.pokemonId,
      name: c.name,
      spriteUrl: c.spriteUrl,
    }));

    const detail: RaidBossDetailDto = {
      id: boss._id.toString(),
      pokemonId: boss.pokemonId,
      pokemonName: boss.pokemonName,
      pokemonTypes: types,
      tier: boss.tier,
      starRating: this.tierToStars(boss.tier),
      isActive: boss.isActive,
      cp: boss.cp,
      spriteUrl: (pokemon as any)?.spriteUrl,
      quickMoves,
      chargedMoves,
      catchCp,
      weatherBoostedCatchCp,
      currentRankings: {
        overallRank: ranking?.rank ?? 0,
        typeRank: typeRanking,
      },
      league,
      potentialForms,
      allWeaknesses: te.weakTo,
      idealCounters,
      suggestedTeam,
    };

    await this.cacheManager.set(cacheKey, detail, 1800);
    return detail;
  }

  async createQueue(
    userId: string,
    bossId: string,
    dto: CreateRaidQueueDto,
  ): Promise<RaidQueueDto> {
    const boss = await this.raidBossModel.findById(bossId).lean();
    if (!boss) {
      throw new NotFoundException({
        message: 'Raid boss not found',
        code: ERROR_CODES.RAID_BOSS_NOT_FOUND,
      });
    }

    const queue = await this.raidQueueModel.create({
      userId: new Types.ObjectId(userId),
      raidBossId: new Types.ObjectId(bossId),
      pokemonIds: dto.pokemonIds,
    });

    return {
      id: queue._id.toString(),
      raidBossId: bossId,
      pokemonIds: queue.pokemonIds,
      createdAt:
        (queue as any).createdAt?.toISOString() || new Date().toISOString(),
    };
  }

  async getUserQueues(userId: string): Promise<RaidQueueDto[]> {
    const queues = await this.raidQueueModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    return queues.map((q) => ({
      id: q._id.toString(),
      raidBossId: q.raidBossId.toString(),
      pokemonIds: q.pokemonIds,
      createdAt:
        (q as any).createdAt?.toISOString() || new Date().toISOString(),
    }));
  }

  async deleteQueue(userId: string, queueId: string): Promise<void> {
    const result = await this.raidQueueModel.deleteOne({
      _id: new Types.ObjectId(queueId),
      userId: new Types.ObjectId(userId),
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException({
        message: 'Raid queue not found',
        code: ERROR_CODES.RAID_QUEUE_NOT_FOUND,
      });
    }
  }

  private tierToStars(tier: number): number {
    if (tier === 5) return 5;
    if (tier === 3) return 3;
    return 1;
  }

  private estimateDps(pokemon: any): number {
    if (!pokemon) return 0;
    return +(pokemon.baseAtk * 0.12 + 2).toFixed(2);
  }

  private estimateTdo(pokemon: any): number {
    if (!pokemon) return 0;
    const dps = this.estimateDps(pokemon);
    const tankiness = pokemon.baseDef * pokemon.baseSta;
    return +(dps * Math.sqrt(tankiness) * 0.01).toFixed(1);
  }

  private calc100IvCatchCp(pokemon: any, cpm: number): number {
    if (!pokemon) return 0;
    const atk = pokemon.baseAtk + 15;
    const def = pokemon.baseDef + 15;
    const sta = pokemon.baseSta + 15;
    return Math.floor((atk * Math.sqrt(def) * Math.sqrt(sta) * cpm ** 2) / 10);
  }

  private async computeTypeRank(pokemonId: number, types: string[]): Promise<number> {
    if (!types.length) return 0;
    const primaryType = types[0].toLowerCase();
    const sameType = await this.rankingModel
      .find({ league: 'master', mode: 'pvp', pokemonTypes: primaryType })
      .sort({ rank: 1 })
      .lean()
      .exec();
    const idx = sameType.findIndex((r: any) => r.pokemonId === pokemonId);
    return idx >= 0 ? idx + 1 : 0;
  }

  private async loadBossMoves(pokemonId: number): Promise<{ quick: string[]; charged: string[] }> {
    const pmDocs = await this.pokemonMoveModel.find({ pokemonId }).lean().exec();
    const moveIds = pmDocs.map((pm: any) => pm.moveId);
    const moves = await this.moveModel.find({ moveId: { $in: moveIds } }).lean().exec();
    const moveMap = new Map(moves.map((m: any) => [m.moveId, m]));

    const quick: string[] = [];
    const charged: string[] = [];
    for (const pm of pmDocs) {
      const m = moveMap.get((pm as any).moveId);
      if (!m) continue;
      if ((pm as any).moveSlot === 'fast') {
        quick.push((m as any).name);
      } else {
        charged.push(`${(m as any).name}${(pm as any).moveSlot === 'elite' ? '*' : ''}`);
      }
    }
    return { quick, charged };
  }

  private async buildPotentialForms(boss: any, pokemon: any): Promise<PotentialFormDto[]> {
    const forms: PotentialFormDto[] = [];

    if (boss.potentialForms && boss.potentialForms.length > 0) {
      for (const formName of boss.potentialForms) {
        forms.push({ name: formName });
      }
    }

    if (forms.length === 0 && pokemon) {
      const evos = await this.evolutionModel
        .find({ fromPokemonId: boss.pokemonId })
        .lean()
        .exec();
      if (evos.length > 0) {
        const evoIds = evos.map((e: any) => e.toPokemonId);
        const evoPokemon = await this.pokemonModel
          .find({ pokemonId: { $in: evoIds } })
          .lean()
          .exec();
        for (const ep of evoPokemon) {
          forms.push({ name: ep.name });
        }
      }
    }

    return forms;
  }

  private async computeIdealCounters(bossTypes: string[]): Promise<IdealCounterDto[]> {
    const effectiveTypes = new Set<string>();
    for (const t of bossTypes) {
      const lc = t.toLowerCase();
      for (const attacker of WEAK_TO[lc] || []) {
        effectiveTypes.add(attacker);
      }
    }
    if (effectiveTypes.size === 0) return [];

    let rankings = await this.rankingModel
      .find({ league: 'master', mode: 'pvp', pokemonTypes: { $in: [...effectiveTypes] } })
      .sort({ dps: -1 })
      .limit(30)
      .lean()
      .exec();

    if (rankings.length === 0) {
      rankings = await this.rankingModel
        .find({ league: 'master', mode: 'pvp' })
        .sort({ dps: -1 })
        .limit(30)
        .lean()
        .exec();
    }

    const seen = new Set<number>();
    const uniqueRankings: any[] = [];
    for (const r of rankings) {
      if (!seen.has(r.pokemonId) && uniqueRankings.length < 5) {
        seen.add(r.pokemonId);
        uniqueRankings.push(r);
      }
    }

    const counterIds = uniqueRankings.map((r) => r.pokemonId);
    const [pokemonDocs, allPm] = await Promise.all([
      this.pokemonModel.find({ pokemonId: { $in: counterIds } }).lean().exec(),
      this.pokemonMoveModel.find({ pokemonId: { $in: counterIds } }).lean().exec(),
    ]);
    const pMap = new Map(pokemonDocs.map((p: any) => [p.pokemonId, p]));

    const moveIds = [...new Set(allPm.map((pm: any) => pm.moveId))];
    const moves = await this.moveModel.find({ moveId: { $in: moveIds } }).lean().exec();
    const moveMap = new Map(moves.map((m: any) => [m.moveId, m]));

    const maxDps = uniqueRankings[0]?.dps ?? 1;

    return uniqueRankings.map((r, idx) => {
      const p = pMap.get(r.pokemonId);
      const pms = allPm.filter((pm: any) => pm.pokemonId === r.pokemonId);

      const bestFast = pms
        .filter((pm: any) => pm.moveSlot === 'fast')
        .map((pm: any) => moveMap.get(pm.moveId))
        .filter(Boolean)
        .sort((a: any, b: any) => (b.dps ?? b.power ?? 0) - (a.dps ?? a.power ?? 0))[0];

      const bestCharge = pms
        .filter((pm: any) => pm.moveSlot !== 'fast')
        .map((pm: any) => moveMap.get(pm.moveId))
        .filter(Boolean)
        .sort((a: any, b: any) => (b.dps ?? b.power ?? 0) - (a.dps ?? a.power ?? 0))[0];

      const surviveBase = p ? (p.baseDef * p.baseSta) / 10000 : 0.5;
      const survivePercent = Math.min(100, Math.round(surviveBase * 100));
      const effectivenessPercent = Math.round((r.dps / maxDps) * 100);

      return {
        pokemonId: r.pokemonId,
        name: p?.name ?? r.pokemonName ?? `#${r.pokemonId}`,
        types: p?.types ?? r.pokemonTypes ?? [],
        spriteUrl: p?.spriteUrl,
        quickMove: (bestFast as any)?.name,
        chargedMove: (bestCharge as any)?.name,
        dps: r.dps,
        survivePercent,
        effectivenessPercent,
      };
    });
  }
}
