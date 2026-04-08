import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RaidsController } from './raids.controller.js';
import { RaidsService } from './raids.service.js';
import { RaidBoss, RaidBossSchema } from './schemas/raid-boss.schema.js';
import { RaidQueue, RaidQueueSchema } from './schemas/raid-queue.schema.js';
import { Pokemon, PokemonSchema } from '../pokedex/schemas/pokemon.schema.js';
import { Ranking, RankingSchema } from '../rankings/schemas/ranking.schema.js';
import { Move, MoveSchema } from '../pokedex/schemas/move.schema.js';
import { PokemonMove, PokemonMoveSchema } from '../pokedex/schemas/pokemon-move.schema.js';
import { Evolution, EvolutionSchema } from '../pokedex/schemas/evolution.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RaidBoss.name, schema: RaidBossSchema },
      { name: RaidQueue.name, schema: RaidQueueSchema },
      { name: Pokemon.name, schema: PokemonSchema },
      { name: Ranking.name, schema: RankingSchema },
      { name: Move.name, schema: MoveSchema },
      { name: PokemonMove.name, schema: PokemonMoveSchema },
      { name: Evolution.name, schema: EvolutionSchema },
    ]),
  ],
  controllers: [RaidsController],
  providers: [RaidsService],
  exports: [RaidsService],
})
export class RaidsModule {}
