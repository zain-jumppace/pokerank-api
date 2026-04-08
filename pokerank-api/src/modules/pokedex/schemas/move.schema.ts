import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MoveDocument = Move & Document;

@Schema({ timestamps: true, collection: 'moves' })
export class Move {
  @Prop({ required: true, unique: true, index: true })
  moveId!: number;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  power!: number;

  @Prop()
  energy?: number;

  @Prop({ required: true })
  durationMs!: number;

  @Prop({ required: true })
  isFast!: boolean;

  @Prop()
  dps?: number;

  @Prop()
  pvpPower?: number;

  @Prop()
  pvpEnergy?: number;
}

export const MoveSchema = SchemaFactory.createForClass(Move);
