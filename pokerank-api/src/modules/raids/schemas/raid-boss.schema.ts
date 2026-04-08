import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RaidBossDocument = RaidBoss & Document;

@Schema({ timestamps: true, collection: 'raid_bosses' })
export class RaidBoss {
  @Prop({ required: true, index: true })
  pokemonId!: number;

  @Prop({ required: true })
  pokemonName!: string;

  @Prop({ type: [String] })
  pokemonTypes?: string[];

  @Prop({ required: true, enum: [1, 3, 5] })
  tier!: number;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop()
  cp?: number;

  @Prop()
  catchCp?: number;

  @Prop()
  weatherBoostedCatchCp?: number;

  @Prop({ type: [String], default: [] })
  quickMoves?: string[];

  @Prop({ type: [String], default: [] })
  chargedMoves?: string[];

  @Prop({ type: [String], default: [] })
  potentialForms?: string[];

  @Prop({ type: [Number] })
  bossMoveIds?: number[];
}

export const RaidBossSchema = SchemaFactory.createForClass(RaidBoss);
RaidBossSchema.index({ isActive: 1 });
