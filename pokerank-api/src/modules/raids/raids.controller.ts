import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RaidsService } from './raids.service.js';
import { RaidBossDetailDto, RaidBossListDto } from './dto/raid-boss.dto.js';
import {
  CreateRaidQueueDto,
  RaidQueueDto,
} from './dto/create-raid-queue.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Raids')
@Controller('raids')
export class RaidsController {
  constructor(private readonly raidsService: RaidsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active raid bosses with weaknesses, DPS, TDO, league, evolutions' })
  async findAll(): Promise<RaidBossListDto[]> {
    return this.raidsService.findActiveBosses();
  }

  @Get('queues')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user saved raid queues' })
  async getUserQueues(
    @CurrentUser('userId') userId: string,
  ): Promise<RaidQueueDto[]> {
    return this.raidsService.getUserQueues(userId);
  }

  @Get(':bossId')
  @Public()
  @ApiOperation({ summary: 'Full boss detail — moves, catch CP, rankings, forms, weaknesses, 5 ideal counters, suggested team' })
  @ApiParam({ name: 'bossId', type: String })
  async findOne(@Param('bossId') bossId: string): Promise<RaidBossDetailDto> {
    return this.raidsService.findBossById(bossId);
  }

  @Post(':bossId/queue')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a counter team for a raid boss' })
  @ApiParam({ name: 'bossId', type: String })
  async createQueue(
    @CurrentUser('userId') userId: string,
    @Param('bossId') bossId: string,
    @Body() dto: CreateRaidQueueDto,
  ): Promise<RaidQueueDto> {
    return this.raidsService.createQueue(userId, bossId, dto);
  }

  @Delete('queues/:queueId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a saved queue' })
  @ApiParam({ name: 'queueId', type: String })
  async deleteQueue(
    @CurrentUser('userId') userId: string,
    @Param('queueId') queueId: string,
  ): Promise<{ message: string }> {
    await this.raidsService.deleteQueue(userId, queueId);
    return { message: 'Queue deleted successfully' };
  }
}
