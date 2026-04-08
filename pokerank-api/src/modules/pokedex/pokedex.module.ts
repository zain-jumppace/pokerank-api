import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PokedexController } from './pokedex.controller.js';
import { PokedexService } from './pokedex.service.js';
import { PokedexRepository } from './pokedex.repository.js';
import { Pokemon, PokemonSchema } from './schemas/pokemon.schema.js';
import { Move, MoveSchema } from './schemas/move.schema.js';
import {
  PokemonMove,
  PokemonMoveSchema,
} from './schemas/pokemon-move.schema.js';
import { Evolution, EvolutionSchema } from './schemas/evolution.schema.js';
import { Ranking, RankingSchema } from '../rankings/schemas/ranking.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pokemon.name, schema: PokemonSchema },
      { name: Move.name, schema: MoveSchema },
      { name: PokemonMove.name, schema: PokemonMoveSchema },
      { name: Evolution.name, schema: EvolutionSchema },
      { name: Ranking.name, schema: RankingSchema },
    ]),
  ],
  controllers: [PokedexController],
  providers: [PokedexService, PokedexRepository],
  exports: [PokedexService, PokedexRepository],
})
export class PokedexModule {}
