import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RankingsController } from './rankings.controller.js';
import { RankingsService } from './rankings.service.js';
import { RankingsRepository } from './rankings.repository.js';
import { Ranking, RankingSchema } from './schemas/ranking.schema.js';
import {
  RankingHistory,
  RankingHistorySchema,
} from './schemas/ranking-history.schema.js';
import { Pokemon, PokemonSchema } from '../pokedex/schemas/pokemon.schema.js';
import { Move, MoveSchema } from '../pokedex/schemas/move.schema.js';
import {
  PokemonMove,
  PokemonMoveSchema,
} from '../pokedex/schemas/pokemon-move.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ranking.name, schema: RankingSchema },
      { name: RankingHistory.name, schema: RankingHistorySchema },
      { name: Pokemon.name, schema: PokemonSchema },
      { name: Move.name, schema: MoveSchema },
      { name: PokemonMove.name, schema: PokemonMoveSchema },
    ]),
  ],
  controllers: [RankingsController],
  providers: [RankingsService, RankingsRepository],
  exports: [RankingsService],
})
export class RankingsModule {}
