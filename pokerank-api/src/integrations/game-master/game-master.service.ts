import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GameMasterCache,
  GameMasterCacheDocument,
} from './schemas/game-master-cache.schema.js';
import {
  CpMultiplierTable,
  GameMasterTemplate,
} from './interfaces/game-master.interface.js';

@Injectable()
export class GameMasterService {
  private readonly logger = new Logger(GameMasterService.name);

  constructor(
    @InjectModel(GameMasterCache.name)
    private readonly cacheModel: Model<GameMasterCacheDocument>,
  ) {}

  async getCpMultipliers(): Promise<number[]> {
    const entry = await this.cacheModel
      .findOne({ templateId: 'PLAYER_LEVEL_SETTINGS' })
      .lean();
    if (!entry?.data?.cpMultiplier) {
      return this.getDefaultCpMultipliers();
    }
    return entry.data.cpMultiplier;
  }

  async getMoveData(moveId: string): Promise<Record<string, any> | null> {
    const entry = await this.cacheModel.findOne({ templateId: moveId }).lean();
    return entry?.data || null;
  }

  async getAllPokemonTemplates(): Promise<GameMasterCacheDocument[]> {
    return this.cacheModel
      .find({ templateType: 'POKEMON' })
      .lean()
      .exec() as unknown as Promise<GameMasterCacheDocument[]>;
  }

  async upsertTemplate(
    templateId: string,
    templateType: string,
    data: Record<string, any>,
  ): Promise<void> {
    await this.cacheModel.updateOne(
      { templateId },
      { templateId, templateType, data, syncedAt: new Date() },
      { upsert: true },
    );
  }

  extractCpMultipliers(templates: GameMasterTemplate[]): number[] {
    const levelSettings = templates.find(
      (t) => t.templateId === 'PLAYER_LEVEL_SETTINGS',
    );
    return (
      levelSettings?.playerLevel?.cpMultiplier || this.getDefaultCpMultipliers()
    );
  }

  private getDefaultCpMultipliers(): number[] {
    return [
      0.094, 0.1351374318, 0.16639787, 0.192650919, 0.21573247, 0.2365726613,
      0.25572005, 0.2735303812, 0.29024988, 0.3060573775, 0.3210876,
      0.3354450362, 0.34921268, 0.3624577511, 0.3752356, 0.387592416,
      0.39956728, 0.4111935514, 0.4225, 0.4329264091, 0.44310755, 0.4530599591,
      0.4627984, 0.472336093, 0.48168495, 0.4908558003, 0.49985844, 0.508701765,
      0.51739395, 0.5259425113, 0.5343543, 0.5426357375, 0.5507927,
      0.5588305862, 0.5667545, 0.5745691333, 0.5822789, 0.5898879072, 0.5974,
      0.6048236651, 0.6121573, 0.6194041216, 0.6265671, 0.6336491432,
      0.64065295, 0.6475809666, 0.65443563, 0.6612192524, 0.667934,
      0.6745818959, 0.6811649, 0.6876849038, 0.69414365, 0.70054287, 0.7068842,
      0.7131691091, 0.7193991, 0.7255756136, 0.7317, 0.7347410093,
    ];
  }
}
