import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Types } from 'mongoose';
import { EventsService } from './events.service.js';
import { EventsRepository } from './events.repository.js';

const eventId = new Types.ObjectId();
const mockEvent = {
  _id: eventId,
  internalId: 'evt-001',
  name: 'Community Day',
  description: 'A fun event',
  bannerImageUrl: 'https://example.com/banner.png',
  bonuses: [{ label: '2x Stardust', icon: 'stardust' }],
  featuredPokemonIds: [25, 150],
  startDate: new Date('2025-06-01'),
  endDate: new Date('2025-06-02'),
  timezone: 'UTC',
  visibility: 'live',
  priority: 10,
};

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockRepository = {
  findPublic: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createAuditLog: jest.fn(),
  getAuditLogs: jest.fn(),
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EventsRepository, useValue: mockRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
    mockRepository.createAuditLog.mockResolvedValue(undefined);
  });

  describe('findPublic', () => {
    it('should return public events', async () => {
      mockRepository.findPublic.mockResolvedValue({ data: [mockEvent], total: 1 });
      const result = await service.findPublic({ page: 1, limit: 20, status: 'all' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Community Day');
    });

    it('should return cached result', async () => {
      const cached = { data: [mockEvent], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      mockCacheManager.get.mockResolvedValue(cached);
      const result = await service.findPublic({ page: 1, limit: 20, status: 'all' });
      expect(result).toBe(cached);
    });
  });

  describe('findById', () => {
    it('should return event detail', async () => {
      mockRepository.findById.mockResolvedValue(mockEvent);
      const result = await service.findById(eventId.toString());
      expect(result.name).toBe('Community Day');
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an event and log audit', async () => {
      mockRepository.create.mockResolvedValue(mockEvent);
      const result = await service.create(
        {
          internalId: 'evt-001',
          name: 'Community Day',
          startDate: '2025-06-01',
          endDate: '2025-06-02',
        },
        '507f191e810c19729de860ea',
      );
      expect(result.name).toBe('Community Day');
      expect(mockRepository.createAuditLog).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      mockRepository.findById.mockResolvedValue(mockEvent);
      mockRepository.update.mockResolvedValue({ ...mockEvent, name: 'Updated Event' });
      const result = await service.update(eventId.toString(), { name: 'Updated Event' }, '507f191e810c19729de860ea');
      expect(result.name).toBe('Updated Event');
    });

    it('should throw NotFoundException when event not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.update('nonexistent', {}, '507f191e810c19729de860ea')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an event and log audit', async () => {
      mockRepository.findById.mockResolvedValue(mockEvent);
      mockRepository.delete.mockResolvedValue(true);
      await expect(service.delete(eventId.toString(), '507f191e810c19729de860ea')).resolves.not.toThrow();
      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE' }),
      );
    });

    it('should throw NotFoundException for missing event', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.delete('nonexistent', '507f191e810c19729de860ea')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish', () => {
    it('should set visibility to live', async () => {
      mockRepository.findById.mockResolvedValue(mockEvent);
      mockRepository.update.mockResolvedValue({ ...mockEvent, visibility: 'live' });
      const result = await service.publish(eventId.toString(), '507f191e810c19729de860ea');
      expect(result.visibility).toBe('live');
    });
  });

  describe('getAuditLog', () => {
    it('should return audit logs', async () => {
      mockRepository.getAuditLogs.mockResolvedValue([
        {
          adminUserId: new Types.ObjectId(),
          action: 'CREATE',
          createdAt: new Date(),
        },
      ]);
      const result = await service.getAuditLog(eventId.toString());
      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('CREATE');
    });
  });
});
