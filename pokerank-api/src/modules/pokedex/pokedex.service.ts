import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PokedexRepository } from './pokedex.repository.js';
import { PokemonFilterDto } from './dto/pokemon-filter.dto.js';
import {
  PokemonDetailDto,
  PokemonListItemDto,
  PokemonNeighborsDto,
  TrendingPokemonDto,
  MoveDto,
  EvolutionStageDto,
  LeagueRankingDto,
  BestUseCaseDto,
} from './dto/pokemon-detail.dto.js';
import { Ranking, RankingDocument } from '../rankings/schemas/ranking.schema.js';
import { getTypeEffectiveness } from '../../common/constants/type-chart.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

const CPM_40 = 0.7903;
const LEAGUES = ['great', 'ultra', 'master'] as const;

@Injectable()
export class PokedexService {
  constructor(
    private readonly pokedexRepository: PokedexRepository,
    @InjectModel(Ranking.name)
    private readonly rankingModel: Model<RankingDocument>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async findAll(filter: PokemonFilterDto): Promise<{
    data: PokemonListItemDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const cacheKey = `pokemon:list:${JSON.stringify(filter)}`;
    const cached = await this.cacheManager.get<{
      data: PokemonListItemDto[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(cacheKey);
    if (cached) return cached;

    const { data, total } = await this.pokedexRepository.findAll(filter);
    const result = {
      data: data.map((p) => this.toListItem(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cacheManager.set(cacheKey, result, 3600);
    return result;
  }

  async findOne(pokemonId: number): Promise<PokemonDetailDto> {
    const cacheKey = `pokemon:detail:v2:${pokemonId}`;
    const cached = await this.cacheManager.get<PokemonDetailDto>(cacheKey);
    if (cached) return cached;

    const pokemon = await this.pokedexRepository.findByPokemonId(pokemonId);
    if (!pokemon) {
      throw new NotFoundException({
        message: `Pokémon with id ${pokemonId} does not exist.`,
        code: ERROR_CODES.POKEMON_NOT_FOUND,
      });
    }

    const chainPokemon = pokemon.evolutionChainId
      ? await this.pokedexRepository.findByEvolutionChainId(pokemon.evolutionChainId)
      : [];
    const chainIds = chainPokemon.map((p: any) => p.pokemonId);

    const [movesRaw, evolutionsRaw, neighbors, rankings] = await Promise.all([
      this.pokedexRepository.findMovesByPokemonId(pokemonId),
      chainIds.length > 0
        ? this.pokedexRepository.findEvolutionsByChain(chainIds)
        : this.pokedexRepository.findEvolutionsByPokemonId(pokemonId),
      this.pokedexRepository.findNeighbors(pokemonId),
      this.rankingModel
        .find({ pokemonId, mode: 'pvp' })
        .lean()
        .exec(),
    ]);

    const atk = pokemon.baseAtk;
    const def = pokemon.baseDef;
    const sta = pokemon.baseSta;
    const totalStats = atk + def + sta;
    const maxCp = this.calcMaxCp(atk, def, sta);
    const statProduct = atk * def * sta;

    const fastMoves: MoveDto[] = [];
    const chargeMoves: MoveDto[] = [];
    for (const m of movesRaw) {
      const dto: MoveDto = {
        moveId: m.moveId,
        name: m.name,
        type: m.type,
        power: m.power ?? 0,
        energy: m.energy ?? m.pvpEnergy ?? 0,
        dps: m.dps ?? 0,
        isElite: m.moveSlot === 'elite' || undefined,
      };
      if (m.moveSlot === 'fast') {
        fastMoves.push(dto);
      } else {
        chargeMoves.push(dto);
      }
    }

    const typeEffectiveness = getTypeEffectiveness(pokemon.types);

    const evolutionChain = await this.buildEvolutionChain(
      pokemonId,
      pokemon.evolutionChainId,
      evolutionsRaw,
    );

    const leagueRankings: LeagueRankingDto[] = LEAGUES.map((league) => {
      const r = rankings.find((rk: any) => rk.league === league);
      return {
        league,
        rank: r?.rank ?? 0,
        dps: r?.dps ?? 0,
        rating: this.rankToRating(r?.rank),
      };
    });

    const bestUseCases = this.computeBestUseCases(rankings);

    const detail: PokemonDetailDto = {
      pokemonId: pokemon.pokemonId,
      name: pokemon.name,
      types: pokemon.types,
      baseAtk: atk,
      baseDef: def,
      baseSta: sta,
      totalStats,
      maxCp,
      statProduct,
      generation: pokemon.generation,
      region: pokemon.region,
      spriteUrl: pokemon.spriteUrl,
      flavorText: pokemon.flavorText,
      fastMoves,
      chargeMoves,
      typeEffectiveness,
      evolutionChain,
      rankings: leagueRankings,
      bestUseCases,
      prevId: neighbors.prev?.pokemonId,
      nextId: neighbors.next?.pokemonId,
    };

    await this.cacheManager.set(cacheKey, detail, 86400);
    return detail;
  }

  async search(query: string): Promise<PokemonListItemDto[]> {
    const results = await this.pokedexRepository.findByName(query);
    return results.map((p) => this.toListItem(p));
  }

  async getNeighbors(pokemonId: number): Promise<PokemonNeighborsDto> {
    const neighbors = await this.pokedexRepository.findNeighbors(pokemonId);
    return {
      prev: neighbors.prev ? this.toListItem(neighbors.prev) : undefined,
      next: neighbors.next ? this.toListItem(neighbors.next) : undefined,
    };
  }

  async getTrending(limit = 10): Promise<TrendingPokemonDto[]> {
    const cacheKey = `pokemon:trending:${limit}`;
    const cached = await this.cacheManager.get<TrendingPokemonDto[]>(cacheKey);
    if (cached) return cached;

    const topRankings = await this.rankingModel
      .find({ mode: 'pvp' })
      .sort({ rank: 1 })
      .limit(limit * 3)
      .lean()
      .exec();

    const seen = new Set<number>();
    const unique: any[] = [];
    for (const r of topRankings) {
      if (!seen.has(r.pokemonId) && unique.length < limit) {
        seen.add(r.pokemonId);
        unique.push(r);
      }
    }

    const pokemonIds = unique.map((r) => r.pokemonId);
    const pokemonDocs = await this.pokedexRepository.findByPokemonIds(pokemonIds);
    const pokemonMap = new Map(pokemonDocs.map((p: any) => [p.pokemonId, p]));

    const result: TrendingPokemonDto[] = unique.map((r) => {
      const p = pokemonMap.get(r.pokemonId);
      return {
        pokemonId: r.pokemonId,
        name: p?.name ?? r.pokemonName ?? '',
        types: p?.types ?? r.pokemonTypes ?? [],
        baseAtk: p?.baseAtk ?? 0,
        baseDef: p?.baseDef ?? 0,
        baseSta: p?.baseSta ?? 0,
        spriteUrl: p?.spriteUrl,
        overallRanking: r.rank,
        league: r.league,
      };
    });

    await this.cacheManager.set(cacheKey, result, 1800);
    return result;
  }

  private toListItem(pokemon: any): PokemonListItemDto {
    return {
      pokemonId: pokemon.pokemonId,
      name: pokemon.name,
      types: pokemon.types,
      baseAtk: pokemon.baseAtk,
      baseDef: pokemon.baseDef,
      baseSta: pokemon.baseSta,
      spriteUrl: pokemon.spriteUrl,
    };
  }

  private calcMaxCp(atk: number, def: number, sta: number): number {
    const atkIv = atk + 15;
    const defIv = def + 15;
    const staIv = sta + 15;
    return Math.floor(
      (atkIv * Math.sqrt(defIv) * Math.sqrt(staIv) * CPM_40 ** 2) / 10,
    );
  }

  private rankToRating(rank?: number): string {
    if (!rank) return 'N/A';
    if (rank <= 20) return 'S';
    if (rank <= 50) return 'A';
    if (rank <= 100) return 'B';
    if (rank <= 200) return 'C';
    return 'D';
  }

  private computeBestUseCases(rankings: any[]): BestUseCaseDto[] {
    const pvpRank = rankings.find((r: any) => r.league === 'great')?.rank ?? 999;
    const raidRank = rankings.find((r: any) => r.league === 'master')?.rank ?? 999;

    const pvpStars = pvpRank <= 20 ? 5 : pvpRank <= 50 ? 4 : pvpRank <= 100 ? 3 : pvpRank <= 200 ? 2 : 1;
    const raidStars = raidRank <= 20 ? 5 : raidRank <= 50 ? 4 : raidRank <= 100 ? 3 : raidRank <= 200 ? 2 : 1;

    return [
      { category: 'PvP', rating: pvpStars },
      { category: 'Raid', rating: raidStars },
    ];
  }

  private async buildEvolutionChain(
    currentId: number,
    chainId: number | undefined,
    rawEvolutions: any[],
  ): Promise<EvolutionStageDto[]> {
    if (!rawEvolutions.length) return [];

    const allIds = new Set<number>();
    for (const e of rawEvolutions) {
      allIds.add(e.fromPokemonId);
      allIds.add(e.toPokemonId);
    }

    const pokemonDocs = await this.pokedexRepository.findByPokemonIds([...allIds]);
    const pokemonMap = new Map(pokemonDocs.map((p: any) => [p.pokemonId, p]));

    const rankings = await this.rankingModel
      .find({ pokemonId: { $in: [...allIds] }, mode: 'pvp' })
      .lean()
      .exec();

    const ordered = this.orderEvolutionChain(rawEvolutions, [...allIds]);
    const totalStages = ordered.length;

    return ordered.map((id, index) => {
      const p = pokemonMap.get(id);
      const evo = rawEvolutions.find((e) => e.toPokemonId === id);
      const stageRankings: LeagueRankingDto[] = LEAGUES.map((league) => {
        const r = rankings.find((rk: any) => rk.pokemonId === id && rk.league === league);
        return { league, rank: r?.rank ?? 0, dps: r?.dps ?? 0 };
      });

      return {
        pokemonId: id,
        name: p?.name ?? `#${id}`,
        spriteUrl: p?.spriteUrl,
        generation: p?.generation ?? 0,
        baseStatsTotal: (p?.baseAtk ?? 0) + (p?.baseDef ?? 0) + (p?.baseSta ?? 0),
        candyCost: evo?.candyCost,
        conditions: evo?.conditions,
        stageLabel: `${index + 1}/${totalStages}`,
        rankings: stageRankings,
      };
    });
  }

  private orderEvolutionChain(evolutions: any[], allIds: number[]): number[] {
    const childOf = new Map<number, number>();
    for (const e of evolutions) {
      childOf.set(e.toPokemonId, e.fromPokemonId);
    }

    let root = allIds[0];
    for (const id of allIds) {
      if (!childOf.has(id)) {
        root = id;
        break;
      }
    }

    const ordered: number[] = [root];
    const childrenOf = new Map<number, number[]>();
    for (const e of evolutions) {
      const list = childrenOf.get(e.fromPokemonId) || [];
      list.push(e.toPokemonId);
      childrenOf.set(e.fromPokemonId, list);
    }

    const queue = [root];
    const visited = new Set<number>([root]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenOf.get(current) || [];
      children.sort((a, b) => a - b);
      for (const child of children) {
        if (!visited.has(child)) {
          visited.add(child);
          ordered.push(child);
          queue.push(child);
        }
      }
    }

    return ordered;
  }
}
