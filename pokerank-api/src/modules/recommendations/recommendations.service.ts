import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecommendationInputDto } from './dto/recommendation-input.dto.js';
import {
  RecommendationCostDto,
  RecommendationResultDto,
} from './dto/recommendation-result.dto.js';
import { Pokemon, PokemonDocument } from '../pokedex/schemas/pokemon.schema.js';
import { Ranking, RankingDocument } from '../rankings/schemas/ranking.schema.js';

const CPM_40 = 0.7903;

const POWER_UP_TABLE: { fromLevel: number; stardust: number; candy: number }[] =
  [
    { fromLevel: 1, stardust: 200, candy: 1 },
    { fromLevel: 5, stardust: 400, candy: 1 },
    { fromLevel: 10, stardust: 600, candy: 1 },
    { fromLevel: 15, stardust: 800, candy: 1 },
    { fromLevel: 20, stardust: 2500, candy: 2 },
    { fromLevel: 25, stardust: 3500, candy: 3 },
    { fromLevel: 30, stardust: 5000, candy: 4 },
    { fromLevel: 35, stardust: 8000, candy: 6 },
    { fromLevel: 40, stardust: 10000, candy: 8 },
  ];

const EVOLVE_CANDY_DEFAULT = 50;

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<PokemonDocument>,
    @InjectModel(Ranking.name)
    private readonly rankingModel: Model<RankingDocument>,
  ) {}

  async generateRecommendations(
    dto: RecommendationInputDto,
  ): Promise<RecommendationResultDto[]> {
    const pokemonIds = dto.ownedPokemon.map((p) => p.pokemonId);
    const [pokemonDocs, rankings] = await Promise.all([
      this.pokemonModel.find({ pokemonId: { $in: pokemonIds } }).lean().exec(),
      this.rankingModel
        .find({ pokemonId: { $in: pokemonIds }, mode: 'pvp' })
        .lean()
        .exec(),
    ]);

    const pokemonMap = new Map(pokemonDocs.map((p: any) => [p.pokemonId, p]));
    const rankingMap = new Map<string, any>();
    for (const r of rankings) {
      const key = `${r.pokemonId}:${r.league}`;
      if (!rankingMap.has(key) || r.rank < rankingMap.get(key).rank) {
        rankingMap.set(key, r);
      }
    }

    const results: RecommendationResultDto[] = [];

    for (const owned of dto.ownedPokemon) {
      const ivTotal = owned.ivAtk + owned.ivDef + owned.ivSta;
      const ivPercent = Math.round((ivTotal / 45) * 100);
      const p = pokemonMap.get(owned.pokemonId);

      if (ivPercent < 80) continue;

      const bestRanking =
        rankingMap.get(`${owned.pokemonId}:great`) ??
        rankingMap.get(`${owned.pokemonId}:ultra`) ??
        rankingMap.get(`${owned.pokemonId}:master`);

      const estimatedCp = p
        ? this.estimateMaxCp(
            p.baseAtk + owned.ivAtk,
            p.baseDef + owned.ivDef,
            p.baseSta + owned.ivSta,
          )
        : undefined;

      if (owned.currentLevel < 30) {
        const powerUpCost = this.estimatePowerUpCost(
          owned.currentLevel,
          40,
        );

        const hasEnoughResources =
          dto.stardust >= powerUpCost.stardust &&
          (owned.candyCount == null ||
            owned.candyCount >= powerUpCost.candy);

        const reasoning = hasEnoughResources
          ? `High IV (${ivPercent}%) at level ${owned.currentLevel}. You have enough resources — powering up would significantly increase CP and battle effectiveness.`
          : `High IV (${ivPercent}%) at level ${owned.currentLevel}. Powering up would significantly increase CP, but you may need more resources.`;

        results.push({
          pokemonId: owned.pokemonId,
          pokemonName: p?.name,
          spriteUrl: p?.spriteUrl,
          action: 'POWER_UP',
          reasoning,
          league: bestRanking?.league ?? 'master',
          metaRank: bestRanking?.rank,
          estimatedCp,
          ivPercent,
          cost: {
            stardust: powerUpCost.stardust,
            candy: powerUpCost.candy,
            candyLabel: p
              ? `${p.name} (${powerUpCost.candy})`
              : undefined,
          },
        });
      }

      const evolveCost: RecommendationCostDto = {
        stardust: 0,
        candy: EVOLVE_CANDY_DEFAULT,
        candyLabel: p
          ? `${p.name} (${EVOLVE_CANDY_DEFAULT})`
          : undefined,
      };

      results.push({
        pokemonId: owned.pokemonId,
        pokemonName: p?.name,
        spriteUrl: p?.spriteUrl,
        action: 'EVOLVE',
        reasoning: `Strong IVs (${ivPercent}%) make this a good evolution candidate for competitive use.`,
        league: bestRanking?.league ?? 'ultra',
        metaRank: bestRanking?.rank,
        estimatedCp,
        ivPercent,
        cost: evolveCost,
      });
    }

    return results;
  }

  private estimateMaxCp(atk: number, def: number, sta: number): number {
    return Math.floor(
      (atk * Math.sqrt(def) * Math.sqrt(sta) * CPM_40 ** 2) / 10,
    );
  }

  private estimatePowerUpCost(
    fromLevel: number,
    toLevel: number,
  ): { stardust: number; candy: number } {
    let totalStardust = 0;
    let totalCandy = 0;

    for (let lvl = fromLevel; lvl < toLevel; lvl += 0.5) {
      const tier =
        [...POWER_UP_TABLE]
          .reverse()
          .find((t) => lvl >= t.fromLevel) ?? POWER_UP_TABLE[0];
      totalStardust += tier.stardust;
      totalCandy += tier.candy;
    }

    return { stardust: totalStardust, candy: totalCandy };
  }
}
