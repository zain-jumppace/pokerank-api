import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type HistoryEntryDocument = HistoryEntry & Document;

@Schema({ timestamps: true, collection: 'history_entries' })
export class HistoryEntry {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  pokemonId!: number;

  @Prop()
  pokemonName?: string;

  @Prop({ type: [String] })
  pokemonTypes?: string[];

  @Prop()
  spriteUrl?: string;

  @Prop({ required: true })
  league!: string;

  @Prop()
  metaRank?: number;

  @Prop()
  ivPercent?: number;

  @Prop()
  ivAtk?: number;

  @Prop()
  ivDef?: number;

  @Prop()
  ivSta?: number;

  @Prop()
  cp?: number;

  @Prop()
  dps?: number;

  @Prop()
  tdo?: number;

  @Prop()
  tier?: string;

  @Prop({ type: [String], default: [] })
  notes?: string[];

  @Prop({ required: true, default: () => new Date() })
  analyzedAt!: Date;

  @Prop()
  deletedAt?: Date;
}

export const HistoryEntrySchema = SchemaFactory.createForClass(HistoryEntry);
HistoryEntrySchema.index({ userId: 1, analyzedAt: -1 });
HistoryEntrySchema.index({ userId: 1, pokemonId: 1 });
