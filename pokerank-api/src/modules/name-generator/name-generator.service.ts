import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserPreset,
  UserPresetDocument,
} from './schemas/user-preset.schema.js';
import { Pokemon, PokemonDocument } from '../pokedex/schemas/pokemon.schema.js';
import {
  GenerateNameDto,
  GenerateNameResponseDto,
} from './dto/generate-name.dto.js';
import { PresetDto, SavePresetDto } from './dto/save-preset.dto.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

const LEAGUE_ABBREVIATIONS: Record<string, string> = {
  great: 'GL',
  ultra: 'UL',
  master: 'ML',
};

const ROLE_ABBREVIATIONS: Record<string, string> = {
  attacker: 'ATK',
  tank: 'TNK',
  support: 'SUP',
};

function abbreviateMove(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

@Injectable()
export class NameGeneratorService {
  constructor(
    @InjectModel(UserPreset.name)
    private readonly presetModel: Model<UserPresetDocument>,
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<PokemonDocument>,
  ) {}

  async generate(dto: GenerateNameDto): Promise<GenerateNameResponseDto> {
    const pokemon = await this.pokemonModel
      .findOne({ pokemonId: dto.pokemonId })
      .lean()
      .exec();
    const species = pokemon?.name ?? `#${dto.pokemonId}`;

    const fastAbbr = dto.fastMove ? abbreviateMove(dto.fastMove) : '';
    const chargeAbbr = dto.chargeMove ? abbreviateMove(dto.chargeMove) : '';
    const moveset = fastAbbr && chargeAbbr ? `${fastAbbr}/${chargeAbbr}` : fastAbbr || chargeAbbr;

    const replacements: Record<string, string> = {
      '{Species}': species,
      '{IV}': dto.ivPercent?.toString() ?? '',
      '{IVSpread}': dto.ivSpread ?? '',
      '{League}': dto.league ? LEAGUE_ABBREVIATIONS[dto.league] || dto.league : '',
      '{Role}': dto.role ? ROLE_ABBREVIATIONS[dto.role] || dto.role : '',
      '{Moveset}': moveset,
      '{Rank}': dto.rank?.toString() ?? '',
      '{CP}': dto.cp?.toString() ?? '',
      '{DPS}': '',
    };

    let name = dto.template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      name = name.split(placeholder).join(value);
    }

    if (name.length > 12) {
      name = name.substring(0, 12);
    }

    return { generatedName: name, pokemonName: species };
  }

  async savePreset(userId: string, dto: SavePresetDto): Promise<PresetDto> {
    const preset = await this.presetModel.create({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      template: dto.template,
    });
    return {
      id: preset._id.toString(),
      name: preset.name,
      template: preset.template,
    };
  }

  async getPresets(userId: string): Promise<PresetDto[]> {
    const presets = await this.presetModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
    return presets.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      template: p.template,
    }));
  }

  async deletePreset(userId: string, presetId: string): Promise<void> {
    const result = await this.presetModel.deleteOne({
      _id: new Types.ObjectId(presetId),
      userId: new Types.ObjectId(userId),
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException({
        message: 'Preset not found',
        code: ERROR_CODES.PRESET_NOT_FOUND,
      });
    }
  }
}
