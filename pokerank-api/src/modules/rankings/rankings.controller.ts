import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RankingsService } from './rankings.service.js';
import { LeagueFilterDto } from './dto/league-filter.dto.js';
import { RankingDetailDto, RankingEntryDto } from './dto/ranking-entry.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ParsePositiveIntPipe } from '../../common/pipes/parse-positive-int.pipe.js';

@ApiTags('Rankings')
@Controller('rankings')
@Public()
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rankings with filters' })
  async findAll(
    @Query() filter: LeagueFilterDto,
  ): Promise<{ data: RankingEntryDto[]; meta: any }> {
    return this.rankingsService.findAll(filter);
  }

  @Get(':pokemonId')
  @ApiOperation({ summary: 'Get detail ranking for one Pokémon' })
  @ApiParam({ name: 'pokemonId', type: Number })
  async findOne(
    @Param('pokemonId', ParsePositiveIntPipe) pokemonId: number,
    @Query('league') league: string,
    @Query('mode') mode: string,
  ): Promise<RankingDetailDto> {
    return this.rankingsService.findByPokemonId(
      pokemonId,
      league || 'great',
      mode || 'pvp',
    );
  }
}
