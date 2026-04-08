import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NameGeneratorController } from './name-generator.controller.js';
import { NameGeneratorService } from './name-generator.service.js';
import { UserPreset, UserPresetSchema } from './schemas/user-preset.schema.js';
import { Pokemon, PokemonSchema } from '../pokedex/schemas/pokemon.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPreset.name, schema: UserPresetSchema },
      { name: Pokemon.name, schema: PokemonSchema },
    ]),
  ],
  controllers: [NameGeneratorController],
  providers: [NameGeneratorService],
  exports: [NameGeneratorService],
})
export class NameGeneratorModule {}
