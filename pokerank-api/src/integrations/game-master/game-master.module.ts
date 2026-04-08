import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GameMasterService } from './game-master.service.js';
import { GameMasterSyncService } from './game-master.sync.service.js';
import {
  GameMasterCache,
  GameMasterCacheSchema,
} from './schemas/game-master-cache.schema.js';

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    ConfigModule,
    MongooseModule.forFeature([
      { name: GameMasterCache.name, schema: GameMasterCacheSchema },
    ]),
  ],
  providers: [GameMasterService, GameMasterSyncService],
  exports: [GameMasterService, GameMasterSyncService],
})
export class GameMasterModule {}
