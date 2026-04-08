import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PokeApiService } from './pokeapi.service.js';

@Module({
  imports: [HttpModule.register({ timeout: 10000 }), ConfigModule],
  providers: [PokeApiService],
  exports: [PokeApiService],
})
export class PokeApiModule {}
