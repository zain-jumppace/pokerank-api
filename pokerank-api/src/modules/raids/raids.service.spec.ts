import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Types } from 'mongoose';
import { RaidsService } from './raids.service.js';
import { RaidBoss } from './schemas/raid-boss.schema.js';
import { RaidQueue } from './schemas/raid-queue.schema.js';

const bossId = new Types.ObjectId();
const mockBoss = {
  _id: bossId,
  pokemonId: 150,
  pokemonName: 'Mewtwo',
  pokemonTypes: ['Psychic'],
  tier: 5,
  isActive: true,
  cp: 54148,
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
};

const mockRaidBossModel = {
  find: jest.fn(),
  findById: jest.fn(),
};

const mockRaidQueueModel = {
  create: jest.fn(),
  find: jest.fn(),
  deleteOne: jest.fn(),
};

describe('RaidsService', () => {
  let service: RaidsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RaidsService,
        { provide: getModelToken(RaidBoss.name), useValue: mockRaidBossModel },
        { provide: getModelToken(RaidQueue.name), useValue: mockRaidQueueModel },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<RaidsService>(RaidsService);
    jest.clearAllMocks();
  });

  describe('findActiveBosses', () => {
    it('should return active raid bosses', async () => {
      mockRaidBossModel.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([mockBoss]) });
      const result = await service.findActiveBosses();
      expect(result).toHaveLength(1);
      expect(result[0].pokemonId).toBe(150);
      expect(result[0].isActive).toBe(true);
    });

    it('should return cached result if available', async () => {
      const cached = [{ pokemonId: 150 }];
      mockCacheManager.get.mockResolvedValue(cached);
      const result = await service.findActiveBosses();
      expect(result).toBe(cached);
    });
  });

  describe('findBossById', () => {
    it('should return boss detail', async () => {
      mockRaidBossModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockBoss) });
      const result = await service.findBossById(bossId.toString());
      expect(result.pokemonId).toBe(150);
      expect(result.counters).toBeDefined();
    });

    it('should throw NotFoundException when boss not found', async () => {
      mockRaidBossModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      await expect(service.findBossById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createQueue', () => {
    it('should create a raid queue', async () => {
      mockRaidBossModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockBoss) });
      mockRaidQueueModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        pokemonIds: [25, 150],
        createdAt: new Date(),
      });
      const result = await service.createQueue(
        new Types.ObjectId().toString(),
        bossId.toString(),
        { pokemonIds: [25, 150] },
      );
      expect(result.pokemonIds).toEqual([25, 150]);
    });

    it('should throw NotFoundException if boss not found', async () => {
      mockRaidBossModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      await expect(
        service.createQueue('user-id', 'bad-boss-id', { pokemonIds: [25] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteQueue', () => {
    it('should delete queue', async () => {
      mockRaidQueueModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      await expect(
        service.deleteQueue(new Types.ObjectId().toString(), new Types.ObjectId().toString()),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if queue not found', async () => {
      mockRaidQueueModel.deleteOne.mockResolvedValue({ deletedCount: 0 });
      await expect(
        service.deleteQueue(new Types.ObjectId().toString(), new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
