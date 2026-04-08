import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RankingHistoryDocument = RankingHistory & Document;

@Schema({ timestamps: true, collection: 'ranking_history' })
export class RankingHistory {
  @Prop({ required: true, index: true })
  pokemonId!: number;

  @Prop({ required: true })
  league!: string;

  @Prop({ required: true })
  mode!: string;

  @Prop({ required: true })
  rank!: number;

  @Prop({ required: true })
  dps!: number;

  @Prop({ required: true })
  tdo!: number;

  @Prop({ required: true })
  snapshotDate!: Date;
}

export const RankingHistorySchema =
  SchemaFactory.createForClass(RankingHistory);
RankingHistorySchema.index({
  pokemonId: 1,
  league: 1,
  mode: 1,
  snapshotDate: -1,
});
