import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service.js';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecommendationsService],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe('generateRecommendations', () => {
    it('should recommend POWER_UP for high IV low level pokemon', async () => {
      const result = await service.generateRecommendations({
        stardust: 50000,
        ownedPokemon: [
          { pokemonId: 147, ivAtk: 15, ivDef: 15, ivSta: 15, currentLevel: 20 },
        ],
      });
      const powerUp = result.find(r => r.action === 'POWER_UP');
      expect(powerUp).toBeDefined();
      expect(powerUp!.pokemonId).toBe(147);
    });

    it('should recommend EVOLVE for high IV pokemon', async () => {
      const result = await service.generateRecommendations({
        stardust: 50000,
        ownedPokemon: [
          { pokemonId: 147, ivAtk: 15, ivDef: 12, ivSta: 14, currentLevel: 20 },
        ],
      });
      const evolve = result.find(r => r.action === 'EVOLVE');
      expect(evolve).toBeDefined();
    });

    it('should not recommend for low IV pokemon', async () => {
      const result = await service.generateRecommendations({
        stardust: 50000,
        ownedPokemon: [
          { pokemonId: 147, ivAtk: 2, ivDef: 3, ivSta: 1, currentLevel: 20 },
        ],
      });
      expect(result).toHaveLength(0);
    });

    it('should not recommend POWER_UP for high level pokemon', async () => {
      const result = await service.generateRecommendations({
        stardust: 50000,
        ownedPokemon: [
          { pokemonId: 147, ivAtk: 15, ivDef: 15, ivSta: 15, currentLevel: 35 },
        ],
      });
      const powerUp = result.find(r => r.action === 'POWER_UP');
      expect(powerUp).toBeUndefined();
    });

    it('should handle empty pokemon list', async () => {
      const result = await service.generateRecommendations({
        stardust: 50000,
        ownedPokemon: [],
      });
      expect(result).toEqual([]);
    });

    it('should handle multiple pokemon', async () => {
      const result = await service.generateRecommendations({
        stardust: 100000,
        ownedPokemon: [
          { pokemonId: 147, ivAtk: 15, ivDef: 15, ivSta: 15, currentLevel: 20 },
          { pokemonId: 280, ivAtk: 14, ivDef: 15, ivSta: 15, currentLevel: 15 },
        ],
      });
      expect(result.length).toBeGreaterThan(0);
      const pokemonIds = result.map(r => r.pokemonId);
      expect(pokemonIds).toContain(147);
      expect(pokemonIds).toContain(280);
    });
  });
});
