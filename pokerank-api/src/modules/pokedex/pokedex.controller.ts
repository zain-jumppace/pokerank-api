import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PokedexService } from './pokedex.service.js';
import { PokemonFilterDto } from './dto/pokemon-filter.dto.js';
import {
  PokemonDetailDto,
  PokemonListItemDto,
  PokemonNeighborsDto,
  TrendingPokemonDto,
} from './dto/pokemon-detail.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ParsePositiveIntPipe } from '../../common/pipes/parse-positive-int.pipe.js';

@ApiTags('Pokédex')
@Controller('pokedex')
@Public()
export class PokedexController {
  constructor(private readonly pokedexService: PokedexService) {}

  @Get()
  @ApiOperation({ summary: 'List Pokémon with filters and pagination' })
  async findAll(
    @Query() filter: PokemonFilterDto,
  ): Promise<{ data: PokemonListItemDto[]; meta: any }> {
    return this.pokedexService.findAll(filter);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending Pokémon (top-ranked across leagues)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTrending(
    @Query('limit') limit?: string,
  ): Promise<TrendingPokemonDto[]> {
    return this.pokedexService.getTrending(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search Pokémon by name' })
  async search(@Query('q') query: string): Promise<PokemonListItemDto[]> {
    return this.pokedexService.search(query || '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full Pokémon detail — stats, moves, type effectiveness, evolution chain, rankings, best use cases' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id', ParsePositiveIntPipe) id: number,
  ): Promise<PokemonDetailDto> {
    return this.pokedexService.findOne(id);
  }

  @Get(':id/neighbors')
  @ApiOperation({ summary: 'Get prev/next Pokémon for swipe navigation' })
  @ApiParam({ name: 'id', type: Number })
  async getNeighbors(
    @Param('id', ParsePositiveIntPipe) id: number,
  ): Promise<PokemonNeighborsDto> {
    return this.pokedexService.getNeighbors(id);
  }
}
