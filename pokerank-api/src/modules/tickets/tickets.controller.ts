import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { Types } from 'mongoose';
import { TicketsService } from './tickets.service.js';
import {
  AdminReplyDto,
  AdminTicketResponseDto,
  TicketResponseDto,
  UpdateTicketStatusDto,
} from './dto/ticket.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { FilesService } from '../files/files.service.js';
import { FileCategory } from '../files/schemas/file.schema.js';

@ApiTags('Tickets')
@Controller()
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly filesService: FilesService,
  ) {}

  // ── User endpoints ─────────────────────────────

  @ApiBearerAuth('Bearer')
  @Post('tickets')
  @SkipThrottle()
  @ApiOperation({ summary: 'Submit a support ticket (multipart: fields + optional media)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: { type: 'string', example: 'App crashes on Pokédex screen' },
        description: {
          type: 'string',
          example: 'When I open Pokédex and scroll, the app freezes...',
        },
        media: {
          type: 'string',
          format: 'binary',
          description: 'Optional screenshot or media file (max 5MB)',
        },
      },
    },
  })
  async createTicket(
    @CurrentUser('userId') userId: string,
    @Req() req: FastifyRequest,
  ): Promise<TicketResponseDto> {
    const { fields, files } = await this.parseTicketMultipart(req, userId);

    if (!fields.title || fields.title.length < 3) {
      throw new BadRequestException('Title is required (min 3 characters)');
    }
    if (!fields.description || fields.description.length < 10) {
      throw new BadRequestException(
        'Description is required (min 10 characters)',
      );
    }

    return this.ticketsService.create(
      userId,
      fields.title,
      fields.description,
      files,
    );
  }

  @ApiBearerAuth('Bearer')
  @Get('tickets')
  @ApiOperation({ summary: 'List my support tickets' })
  async listMyTickets(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
  ): Promise<TicketResponseDto[]> {
    return this.ticketsService.findByUser(userId, status);
  }

  @ApiBearerAuth('Bearer')
  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a specific ticket detail' })
  async getTicket(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<TicketResponseDto> {
    return this.ticketsService.findByIdForUser(id, userId);
  }

  // ── Admin endpoints ────────────────────────────

  @ApiBearerAuth('Bearer')
  @Roles('admin')
  @Get('admin/tickets')
  @ApiOperation({ summary: 'List all support tickets (admin)' })
  async listAllTickets(
    @Query('status') status?: string,
  ): Promise<AdminTicketResponseDto[]> {
    return this.ticketsService.findAll(status);
  }

  @ApiBearerAuth('Bearer')
  @Roles('admin')
  @Get('admin/tickets/:id')
  @ApiOperation({ summary: 'Get ticket detail (admin)' })
  async getTicketAdmin(
    @Param('id') id: string,
  ): Promise<AdminTicketResponseDto> {
    return this.ticketsService.findByIdAdmin(id);
  }

  @ApiBearerAuth('Bearer')
  @Roles('admin')
  @Post('admin/tickets/:id/reply')
  @ApiOperation({ summary: 'Reply to a ticket (admin)' })
  async replyToTicket(
    @CurrentUser('userId') adminUserId: string,
    @Param('id') id: string,
    @Body() dto: AdminReplyDto,
  ): Promise<AdminTicketResponseDto> {
    return this.ticketsService.addAdminReply(id, adminUserId, dto.message);
  }

  @ApiBearerAuth('Bearer')
  @Roles('admin')
  @Patch('admin/tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket status (admin)' })
  async updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ): Promise<AdminTicketResponseDto> {
    return this.ticketsService.updateStatus(id, dto.status);
  }

  // ── Helpers ────────────────────────────────────

  private async parseTicketMultipart(
    req: FastifyRequest,
    userId: string,
  ): Promise<{
    fields: Record<string, string>;
    files: Types.ObjectId[];
  }> {
    const fields: Record<string, string> = {};
    const fileIds: Types.ObjectId[] = [];

    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'media') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk as Buffer);
          }
          const buffer = Buffer.concat(chunks);

          if (part.file.truncated) {
            throw new BadRequestException({
              message: 'File exceeds the maximum allowed size of 5MB',
              code: 'FILE_TOO_LARGE',
            });
          }

          if (buffer.length > 0) {
            const fileDoc = await this.filesService.uploadFileAndReturnDoc(
              userId,
              buffer,
              part.filename,
              part.mimetype,
              FileCategory.TICKETS,
            );
            fileIds.push(fileDoc._id as Types.ObjectId);
          }
        }
      } else {
        fields[part.fieldname] = (part as any).value as string;
      }
    }

    return { fields, files: fileIds };
  }
}
