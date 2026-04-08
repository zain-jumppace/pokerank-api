import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RankingDocument = Ranking & Document;

@Schema({ timestamps: true, collection: 'ranking_entries' })
export class Ranking {
  @Prop({ required: true, index: true })
  pokemonId!: number;

  @Prop({ required: true, enum: ['great', 'ultra', 'master'], index: true })
  league!: string;

  @Prop({ required: true, enum: ['pve', 'pvp'], index: true })
  mode!: string;

  @Prop({ required: true })
  rank!: number;

  @Prop({ required: true })
  dps!: number;

  @Prop({ required: true })
  tdo!: number;

  @Prop()
  statProduct?: number;

  @Prop()
  movesetEfficiency?: number;

  @Prop({ enum: ['attacker', 'tank', 'support'] })
  role?: string;

  @Prop()
  pokemonName?: string;

  @Prop({ type: [String] })
  pokemonTypes?: string[];

  @Prop()
  snapshotDate?: Date;
}

export const RankingSchema = SchemaFactory.createForClass(Ranking);
RankingSchema.index({ league: 1, mode: 1, rank: 1 });
RankingSchema.index({ pokemonId: 1, league: 1, mode: 1 });
