import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryController } from './history.controller.js';
import { HistoryService } from './history.service.js';
import { HistoryRepository } from './history.repository.js';
import {
  HistoryEntry,
  HistoryEntrySchema,
} from './schemas/history-entry.schema.js';
import { Pokemon, PokemonSchema } from '../pokedex/schemas/pokemon.schema.js';
import { Ranking, RankingSchema } from '../rankings/schemas/ranking.schema.js';
import { RaidBoss, RaidBossSchema } from '../raids/schemas/raid-boss.schema.js';
import { RaidQueue, RaidQueueSchema } from '../raids/schemas/raid-queue.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HistoryEntry.name, schema: HistoryEntrySchema },
      { name: Pokemon.name, schema: PokemonSchema },
      { name: Ranking.name, schema: RankingSchema },
      { name: RaidBoss.name, schema: RaidBossSchema },
      { name: RaidQueue.name, schema: RaidQueueSchema },
    ]),
  ],
  controllers: [HistoryController],
  providers: [HistoryService, HistoryRepository],
  exports: [HistoryService],
})
export class HistoryModule {}
