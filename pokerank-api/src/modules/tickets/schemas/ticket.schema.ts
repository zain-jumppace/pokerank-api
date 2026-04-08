import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Schema({ timestamps: true })
export class TicketReply {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  message!: string;

  @Prop({ default: false })
  isAdmin!: boolean;

  @Prop({ default: () => new Date() })
  createdAt!: Date;
}

export const TicketReplySchema = SchemaFactory.createForClass(TicketReply);

@Schema({ timestamps: true, collection: 'tickets' })
export class Ticket {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'FileRecord' }], default: [] })
  attachments!: Types.ObjectId[];

  @Prop({
    required: true,
    enum: TicketStatus,
    default: TicketStatus.OPEN,
    index: true,
  })
  status!: string;

  @Prop({ type: [TicketReplySchema], default: [] })
  replies!: TicketReply[];
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ createdAt: -1 });
