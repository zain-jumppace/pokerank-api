import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HistoryService } from './history.service.js';
import { HistoryRepository } from './history.repository.js';

const mockEntry = {
  _id: { toString: () => 'entry-id-123' },
  pokemonId: 25,
  pokemonName: 'Pikachu',
  league: 'great',
  metaRank: 10,
  ivPercent: 98,
  analyzedAt: new Date('2025-01-01'),
};

const mockRepository = {
  findByUser: jest.fn(),
  findTrend: jest.fn(),
  softDelete: jest.fn(),
  exportAll: jest.fn(),
  create: jest.fn(),
};

describe('HistoryService', () => {
  let service: HistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        { provide: HistoryRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
    jest.clearAllMocks();
  });

  describe('findByUser', () => {
    it('should return paginated history', async () => {
      mockRepository.findByUser.mockResolvedValue({ data: [mockEntry], total: 1 });
      const result = await service.findByUser('user-id', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].pokemonId).toBe(25);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getTrend', () => {
    it('should return trend points', async () => {
      mockRepository.findTrend.mockResolvedValue([
        { ...mockEntry, metaRank: 10 },
        { ...mockEntry, metaRank: 8, analyzedAt: new Date('2025-02-01') },
      ]);
      const result = await service.getTrend('user-id', 25);
      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(10);
    });

    it('should filter out entries without metaRank', async () => {
      mockRepository.findTrend.mockResolvedValue([
        { ...mockEntry, metaRank: null, analyzedAt: new Date() },
        { ...mockEntry, metaRank: 10 },
      ]);
      const result = await service.getTrend('user-id', 25);
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteEntry', () => {
    it('should soft delete entry', async () => {
      mockRepository.softDelete.mockResolvedValue(true);
      await expect(service.deleteEntry('user-id', 'entry-id')).resolves.not.toThrow();
    });

    it('should throw NotFoundException if entry not found', async () => {
      mockRepository.softDelete.mockResolvedValue(false);
      await expect(service.deleteEntry('user-id', 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportHistory', () => {
    it('should export all entries', async () => {
      mockRepository.exportAll.mockResolvedValue([mockEntry]);
      const result = await service.exportHistory('user-id');
      expect(result).toHaveLength(1);
      expect(result[0].pokemonId).toBe(25);
    });
  });

  describe('logAnalysis', () => {
    it('should create a history entry', async () => {
      mockRepository.create.mockResolvedValue(mockEntry);
      await expect(
        service.logAnalysis('507f1f77bcf86cd799439011', 25, 'Pikachu', 'great', 10, 98),
      ).resolves.not.toThrow();
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });
});
