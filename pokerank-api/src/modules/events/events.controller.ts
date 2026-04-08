import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import { EventFilterDto } from './dto/event-filter.dto.js';
import { EventResponseDto } from './dto/event-response.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Events')
@Controller('events')
@Public()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List events' })
  async findAll(
    @Query() filter: EventFilterDto,
  ): Promise<{ data: EventResponseDto[]; meta: any }> {
    return this.eventsService.findPublic(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event detail' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string): Promise<EventResponseDto> {
    return this.eventsService.findById(id);
  }
}
