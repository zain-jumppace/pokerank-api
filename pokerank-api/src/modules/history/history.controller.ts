import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { HistoryService } from './history.service.js';
import {
  HistoryEntryDto,
  HistoryDetailDto,
  HistoryStatsDto,
  HistoryFilterDto,
  TrendPointDto,
  SavedTeamDto,
} from './dto/history.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ParsePositiveIntPipe } from '../../common/pipes/parse-positive-int.pipe.js';

@ApiTags('History')
@ApiBearerAuth()
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get ranking history stats — teams count, pokémon count, avg team size',
  })
  async getStats(
    @CurrentUser('userId') userId: string,
  ): Promise<HistoryStatsDto> {
    return this.historyService.getStats(userId);
  }

  @Get('teams')
  @ApiOperation({
    summary: 'List saved teams with boss name, members, and creation date',
  })
  async getSavedTeams(
    @CurrentUser('userId') userId: string,
  ): Promise<SavedTeamDto[]> {
    return this.historyService.getSavedTeams(userId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export full history as JSON' })
  async exportHistory(
    @CurrentUser('userId') userId: string,
  ): Promise<HistoryEntryDto[]> {
    return this.historyService.exportHistory(userId);
  }

  @Get(':entryId/detail')
  @ApiOperation({
    summary: 'Get single history entry detail with IV breakdown, rank trend, notes',
  })
  @ApiParam({ name: 'entryId', type: String })
  async getDetail(
    @CurrentUser('userId') userId: string,
    @Param('entryId') entryId: string,
  ): Promise<HistoryDetailDto> {
    return this.historyService.getDetail(userId, entryId);
  }

  @Get(':pokemonId/trend')
  @ApiOperation({ summary: 'Get rank trend for one Pokémon' })
  @ApiParam({ name: 'pokemonId', type: Number })
  async getTrend(
    @CurrentUser('userId') userId: string,
    @Param('pokemonId', ParsePositiveIntPipe) pokemonId: number,
  ): Promise<TrendPointDto[]> {
    return this.historyService.getTrend(userId, pokemonId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated ranking history with tier/league filters',
  })
  async findAll(
    @CurrentUser('userId') userId: string,
    @Query() filter: HistoryFilterDto,
  ): Promise<{ data: HistoryEntryDto[]; meta: any }> {
    return this.historyService.findByUser(userId, filter);
  }

  @Delete(':entryId')
  @ApiOperation({ summary: 'Soft-delete one history entry' })
  @ApiParam({ name: 'entryId', type: String })
  async deleteEntry(
    @CurrentUser('userId') userId: string,
    @Param('entryId') entryId: string,
  ): Promise<{ message: string }> {
    await this.historyService.deleteEntry(userId, entryId);
    return { message: 'Entry deleted successfully' };
  }
}
