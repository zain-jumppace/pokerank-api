import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { appConfig, databaseConfig, redisConfig, jwtConfig } from './config/index.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PokedexModule } from './modules/pokedex/pokedex.module.js';
import { RankingsModule } from './modules/rankings/rankings.module.js';
import { RaidsModule } from './modules/raids/raids.module.js';
import { NameGeneratorModule } from './modules/name-generator/name-generator.module.js';
import { HistoryModule } from './modules/history/history.module.js';
import { RecommendationsModule } from './modules/recommendations/recommendations.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { ContentModule } from './modules/content/content.module.js';
import { TicketsModule } from './modules/tickets/tickets.module.js';
import { PokeApiModule } from './integrations/pokeapi/pokeapi.module.js';
import { GameMasterModule } from './integrations/game-master/game-master.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    CacheModule.register({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    AuthModule,
    PokedexModule,
    RankingsModule,
    RaidsModule,
    NameGeneratorModule,
    HistoryModule,
    RecommendationsModule,
    EventsModule,
    FilesModule,
    ContentModule,
    TicketsModule,
    PokeApiModule,
    GameMasterModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
