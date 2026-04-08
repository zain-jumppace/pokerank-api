import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Ticket,
  TicketDocument,
  TicketStatus,
} from './schemas/ticket.schema.js';
import {
  AdminTicketResponseDto,
  TicketResponseDto,
} from './dto/ticket.dto.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
  ) {}

  async create(
    userId: string,
    title: string,
    description: string,
    attachmentIds: Types.ObjectId[],
  ): Promise<TicketResponseDto> {
    const doc = await this.ticketModel.create({
      userId: new Types.ObjectId(userId),
      title,
      description,
      attachments: attachmentIds,
      status: TicketStatus.OPEN,
    });

    const populated = await this.ticketModel
      .findById(doc._id)
      .populate('attachments')
      .exec();

    return this.mapToDto(populated!);
  }

  async findByUser(
    userId: string,
    status?: string,
  ): Promise<TicketResponseDto[]> {
    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (status) query.status = status;

    const docs = await this.ticketModel
      .find(query)
      .populate('attachments')
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((d) => this.mapToDto(d));
  }

  async findByIdForUser(
    ticketId: string,
    userId: string,
  ): Promise<TicketResponseDto> {
    const doc = await this.ticketModel
      .findOne({
        _id: ticketId,
        userId: new Types.ObjectId(userId),
      })
      .populate('attachments')
      .exec();

    if (!doc) {
      throw new NotFoundException({
        message: 'Ticket not found',
        code: ERROR_CODES.TICKET_NOT_FOUND,
      });
    }
    return this.mapToDto(doc);
  }

  // ── Admin ─────────────────────────────────

  async findAll(status?: string): Promise<AdminTicketResponseDto[]> {
    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const docs = await this.ticketModel
      .find(query)
      .populate('attachments')
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((d) => this.mapToAdminDto(d));
  }

  async findByIdAdmin(ticketId: string): Promise<AdminTicketResponseDto> {
    const doc = await this.ticketModel
      .findById(ticketId)
      .populate('attachments')
      .populate('userId', 'email')
      .exec();

    if (!doc) {
      throw new NotFoundException({
        message: 'Ticket not found',
        code: ERROR_CODES.TICKET_NOT_FOUND,
      });
    }
    return this.mapToAdminDto(doc);
  }

  async addAdminReply(
    ticketId: string,
    adminUserId: string,
    message: string,
  ): Promise<AdminTicketResponseDto> {
    const doc = await this.ticketModel
      .findByIdAndUpdate(
        ticketId,
        {
          $push: {
            replies: {
              userId: new Types.ObjectId(adminUserId),
              message,
              isAdmin: true,
              createdAt: new Date(),
            },
          },
          status: TicketStatus.IN_PROGRESS,
        },
        { new: true },
      )
      .populate('attachments')
      .populate('userId', 'email')
      .exec();

    if (!doc) {
      throw new NotFoundException({
        message: 'Ticket not found',
        code: ERROR_CODES.TICKET_NOT_FOUND,
      });
    }
    return this.mapToAdminDto(doc);
  }

  async updateStatus(
    ticketId: string,
    status: string,
  ): Promise<AdminTicketResponseDto> {
    const doc = await this.ticketModel
      .findByIdAndUpdate(ticketId, { status }, { new: true })
      .populate('attachments')
      .populate('userId', 'email')
      .exec();

    if (!doc) {
      throw new NotFoundException({
        message: 'Ticket not found',
        code: ERROR_CODES.TICKET_NOT_FOUND,
      });
    }
    return this.mapToAdminDto(doc);
  }

  private mapToDto(doc: TicketDocument): TicketResponseDto {
    const obj = doc.toObject ? doc.toObject() : doc;
    return {
      id: (obj._id as any).toString(),
      title: obj.title,
      description: obj.description,
      status: obj.status,
      attachments: (obj.attachments || []).map((a: any) => {
        if (typeof a === 'object' && a._id) {
          return {
            id: a._id.toString(),
            fileName: a.fileName,
            fileType: a.fileType,
            url: a.url || a.s3Url || '',
          };
        }
        return { id: a.toString(), fileName: '', fileType: '', url: '' };
      }),
      replies: (obj.replies || []).map((r: any) => ({
        message: r.message,
        isAdmin: r.isAdmin,
        createdAt: r.createdAt?.toISOString?.() ?? '',
      })),
      createdAt: (obj as any).createdAt?.toISOString?.() ?? '',
      updatedAt: (obj as any).updatedAt?.toISOString?.() ?? '',
    };
  }

  private mapToAdminDto(doc: TicketDocument): AdminTicketResponseDto {
    const base = this.mapToDto(doc);
    const obj = doc.toObject ? doc.toObject() : doc;
    const userObj = obj.userId as any;
    return {
      ...base,
      userId: typeof userObj === 'object' && userObj._id
        ? userObj._id.toString()
        : userObj?.toString?.() ?? '',
      userEmail: typeof userObj === 'object' ? userObj.email : undefined,
    };
  }
}
