import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventAuditLogDocument = EventAuditLog & Document;

@Schema({ timestamps: true, collection: 'event_audit_logs' })
export class EventAuditLog {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  eventId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  adminUserId!: Types.ObjectId;

  @Prop({ required: true })
  action!: string;

  @Prop({ type: Object })
  before?: Record<string, any>;

  @Prop({ type: Object })
  after?: Record<string, any>;
}

export const EventAuditLogSchema = SchemaFactory.createForClass(EventAuditLog);
