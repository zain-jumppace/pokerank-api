import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameMasterCacheDocument = GameMasterCache & Document;

@Schema({ timestamps: true, collection: 'game_master_cache' })
export class GameMasterCache {
  @Prop({ required: true, unique: true, index: true })
  templateId!: string;

  @Prop({ required: true, index: true })
  templateType!: string;

  @Prop({ type: Object, required: true })
  data!: Record<string, any>;

  @Prop({ required: true })
  syncedAt!: Date;
}

export const GameMasterCacheSchema =
  SchemaFactory.createForClass(GameMasterCache);
