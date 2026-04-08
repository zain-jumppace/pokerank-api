import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import {
  EventResponseDto,
  AuditLogEntryDto,
} from './dto/event-response.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

@ApiTags('Admin Events')
@ApiBearerAuth()
@Controller('admin/events')
@Roles('admin')
export class EventsAdminController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all events (including hidden)' })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<{ data: EventResponseDto[]; meta: any }> {
    return this.eventsService.findAllAdmin(
      pagination.page ?? 1,
      pagination.limit ?? 20,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create event' })
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser('userId') adminUserId: string,
  ): Promise<EventResponseDto> {
    return this.eventsService.create(dto, adminUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser('userId') adminUserId: string,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, dto, adminUserId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('userId') adminUserId: string,
  ): Promise<{ message: string }> {
    await this.eventsService.delete(id, adminUserId);
    return { message: 'Event deleted successfully' };
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Immediately publish event' })
  async publish(
    @Param('id') id: string,
    @CurrentUser('userId') adminUserId: string,
  ): Promise<EventResponseDto> {
    return this.eventsService.publish(id, adminUserId);
  }

  @Patch(':id/schedule')
  @ApiOperation({ summary: 'Schedule event for future publish' })
  async schedule(
    @Param('id') id: string,
    @CurrentUser('userId') adminUserId: string,
  ): Promise<EventResponseDto> {
    return this.eventsService.schedule(id, adminUserId);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'View audit log for event' })
  async getAuditLog(@Param('id') id: string): Promise<AuditLogEntryDto[]> {
    return this.eventsService.getAuditLog(id);
  }
}
