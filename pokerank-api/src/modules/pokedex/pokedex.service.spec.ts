import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PokedexService } from './pokedex.service.js';
import { PokedexRepository } from './pokedex.repository.js';

const mockPokemon = {
  pokemonId: 25,
  name: 'pikachu',
  types: ['Electric'],
  baseAtk: 211,
  baseDef: 106,
  baseSta: 111,
  generation: 1,
  region: 'Kanto',
  spriteUrl: 'https://example.com/pikachu.png',
  flavorText: 'An electric mouse',
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

const mockRepository = {
  findAll: jest.fn(),
  findByPokemonId: jest.fn(),
  findByName: jest.fn(),
  findNeighbors: jest.fn(),
  findMovesByPokemonId: jest.fn(),
  findEvolutionsByPokemonId: jest.fn(),
};

describe('PokedexService', () => {
  let service: PokedexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokedexService,
        { provide: PokedexRepository, useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<PokedexService>(PokedexService);
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
  });

  describe('findAll', () => {
    it('should return paginated pokemon list', async () => {
      mockRepository.findAll.mockResolvedValue({ data: [mockPokemon], total: 1 });
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].pokemonId).toBe(25);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should return cached result if available', async () => {
      const cachedResult = { data: [{ pokemonId: 25 }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      mockCacheManager.get.mockResolvedValue(cachedResult);
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result).toBe(cachedResult);
      expect(mockRepository.findAll).not.toHaveBeenCalled();
    });

    it('should cache results after fetching', async () => {
      mockRepository.findAll.mockResolvedValue({ data: [mockPokemon], total: 1 });
      await service.findAll({ page: 1, limit: 20 });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return pokemon detail', async () => {
      mockRepository.findByPokemonId.mockResolvedValue(mockPokemon);
      mockRepository.findMovesByPokemonId.mockResolvedValue([]);
      mockRepository.findEvolutionsByPokemonId.mockResolvedValue([]);
      mockRepository.findNeighbors.mockResolvedValue({ prev: null, next: null });

      const result = await service.findOne(25);
      expect(result.pokemonId).toBe(25);
      expect(result.name).toBe('pikachu');
      expect(result.moves).toEqual([]);
      expect(result.evolutions).toEqual([]);
    });

    it('should throw NotFoundException when pokemon not found', async () => {
      mockRepository.findByPokemonId.mockResolvedValue(null);
      await expect(service.findOne(9999)).rejects.toThrow(NotFoundException);
    });

    it('should include neighbor IDs', async () => {
      mockRepository.findByPokemonId.mockResolvedValue(mockPokemon);
      mockRepository.findMovesByPokemonId.mockResolvedValue([]);
      mockRepository.findEvolutionsByPokemonId.mockResolvedValue([]);
      mockRepository.findNeighbors.mockResolvedValue({
        prev: { pokemonId: 24 },
        next: { pokemonId: 26 },
      });

      const result = await service.findOne(25);
      expect(result.prevId).toBe(24);
      expect(result.nextId).toBe(26);
    });
  });

  describe('search', () => {
    it('should return matching pokemon', async () => {
      mockRepository.findByName.mockResolvedValue([mockPokemon]);
      const result = await service.search('pikachu');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('pikachu');
    });

    it('should return empty array for no matches', async () => {
      mockRepository.findByName.mockResolvedValue([]);
      const result = await service.search('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getNeighbors', () => {
    it('should return prev and next', async () => {
      mockRepository.findNeighbors.mockResolvedValue({
        prev: { ...mockPokemon, pokemonId: 24, name: 'arbok' },
        next: { ...mockPokemon, pokemonId: 26, name: 'raichu' },
      });
      const result = await service.getNeighbors(25);
      expect(result.prev).toBeDefined();
      expect(result.next).toBeDefined();
    });

    it('should return undefined for missing neighbors', async () => {
      mockRepository.findNeighbors.mockResolvedValue({ prev: null, next: null });
      const result = await service.getNeighbors(1);
      expect(result.prev).toBeUndefined();
      expect(result.next).toBeUndefined();
    });
  });
});
