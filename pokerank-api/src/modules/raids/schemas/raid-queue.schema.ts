import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RaidQueueDocument = RaidQueue & Document;

@Schema({ timestamps: true, collection: 'raid_queues' })
export class RaidQueue {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  raidBossId!: Types.ObjectId;

  @Prop({ type: [Number], required: true })
  pokemonIds!: number[];
}

export const RaidQueueSchema = SchemaFactory.createForClass(RaidQueue);
