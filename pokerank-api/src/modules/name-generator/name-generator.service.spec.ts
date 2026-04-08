import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NameGeneratorService } from './name-generator.service.js';
import { UserPreset } from './schemas/user-preset.schema.js';

const mockPresetModel = {
  create: jest.fn(),
  find: jest.fn(),
  deleteOne: jest.fn(),
};

describe('NameGeneratorService', () => {
  let service: NameGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NameGeneratorService,
        { provide: getModelToken(UserPreset.name), useValue: mockPresetModel },
      ],
    }).compile();

    service = module.get<NameGeneratorService>(NameGeneratorService);
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should replace Species placeholder', async () => {
      const result = await service.generate(
        { template: '{Species}', pokemonId: 25 },
        'Pikachu',
      );
      expect(result.generatedName).toBe('Pikachu');
    });

    it('should replace IV placeholder', async () => {
      const result = await service.generate(
        { template: '{IV}', pokemonId: 25, ivPercent: 98 },
      );
      expect(result.generatedName).toBe('98');
    });

    it('should replace League abbreviation', async () => {
      const result = await service.generate(
        { template: '{League}', pokemonId: 25, league: 'ultra' },
      );
      expect(result.generatedName).toBe('UL');
    });

    it('should replace Role abbreviation', async () => {
      const result = await service.generate(
        { template: '{Role}', pokemonId: 25, role: 'attacker' },
      );
      expect(result.generatedName).toBe('ATK');
    });

    it('should handle complex template', async () => {
      const result = await service.generate(
        { template: '{Species}_{IV}_{League}', pokemonId: 94, ivPercent: 98, league: 'ultra' },
        'Gengar',
      );
      expect(result.generatedName).toBe('Gengar_98_UL');
    });

    it('should truncate to 12 characters', async () => {
      const result = await service.generate(
        { template: '{Species}_{IV}_{League}_{Role}', pokemonId: 25, ivPercent: 98, league: 'ultra', role: 'attacker' },
        'LongPokemonName',
      );
      expect(result.generatedName.length).toBeLessThanOrEqual(12);
    });

    it('should use pokemon ID when no name provided', async () => {
      const result = await service.generate(
        { template: '{Species}', pokemonId: 25 },
      );
      expect(result.generatedName).toBe('#25');
    });
  });

  describe('savePreset', () => {
    it('should save a preset', async () => {
      mockPresetModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        name: 'PvP Standard',
        template: '{Species}{IV}',
      });
      const result = await service.savePreset('507f1f77bcf86cd799439011', { name: 'PvP Standard', template: '{Species}{IV}' });
      expect(result.name).toBe('PvP Standard');
      expect(result.template).toBe('{Species}{IV}');
    });
  });

  describe('getPresets', () => {
    it('should return user presets', async () => {
      mockPresetModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { _id: new Types.ObjectId(), name: 'Test', template: '{Species}' },
          ]),
        }),
      });
      const result = await service.getPresets('507f1f77bcf86cd799439011');
      expect(result).toHaveLength(1);
    });
  });

  describe('deletePreset', () => {
    it('should delete preset', async () => {
      mockPresetModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
      await expect(service.deletePreset('507f1f77bcf86cd799439011', new Types.ObjectId().toString())).resolves.not.toThrow();
    });

    it('should throw NotFoundException if preset not found', async () => {
      mockPresetModel.deleteOne.mockResolvedValue({ deletedCount: 0 });
      await expect(service.deletePreset('507f1f77bcf86cd799439011', new Types.ObjectId().toString())).rejects.toThrow(NotFoundException);
    });
  });
});
