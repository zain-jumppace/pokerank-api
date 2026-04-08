import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RankingsService } from './rankings.service.js';
import { RankingsRepository } from './rankings.repository.js';

const mockRanking = {
  pokemonId: 150,
  pokemonName: 'Mewtwo',
  pokemonTypes: ['Psychic'],
  league: 'master',
  mode: 'pve',
  rank: 1,
  dps: 22.5,
  tdo: 1500,
  statProduct: 500000,
  movesetEfficiency: 0.95,
  role: 'attacker',
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

const mockRepository = {
  findAll: jest.fn(),
  findByPokemonId: jest.fn(),
  getHistory: jest.fn(),
};

describe('RankingsService', () => {
  let service: RankingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingsService,
        { provide: RankingsRepository, useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<RankingsService>(RankingsService);
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);
  });

  describe('findAll', () => {
    it('should return paginated rankings', async () => {
      mockRepository.findAll.mockResolvedValue({ data: [mockRanking], total: 1 });
      const result = await service.findAll({ league: 'master', mode: 'pve', page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].pokemonId).toBe(150);
      expect(result.meta.total).toBe(1);
    });

    it('should return cached result if available', async () => {
      const cached = { data: [mockRanking], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      mockCacheManager.get.mockResolvedValue(cached);
      const result = await service.findAll({ league: 'master', mode: 'pve', page: 1, limit: 20 });
      expect(result).toBe(cached);
      expect(mockRepository.findAll).not.toHaveBeenCalled();
    });

    it('should cache results after fetching', async () => {
      mockRepository.findAll.mockResolvedValue({ data: [mockRanking], total: 1 });
      await service.findAll({ league: 'master', mode: 'pve', page: 1, limit: 20 });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('findByPokemonId', () => {
    it('should return ranking detail with history', async () => {
      mockRepository.findByPokemonId.mockResolvedValue(mockRanking);
      mockRepository.getHistory.mockResolvedValue([
        { snapshotDate: new Date('2025-01-01'), rank: 1 },
        { snapshotDate: new Date('2025-02-01'), rank: 2 },
      ]);
      const result = await service.findByPokemonId(150, 'master', 'pve');
      expect(result.pokemonId).toBe(150);
      expect(result.history).toHaveLength(2);
    });

    it('should throw NotFoundException when ranking not found', async () => {
      mockRepository.findByPokemonId.mockResolvedValue(null);
      await expect(service.findByPokemonId(9999, 'master', 'pve')).rejects.toThrow(NotFoundException);
    });
  });
});
