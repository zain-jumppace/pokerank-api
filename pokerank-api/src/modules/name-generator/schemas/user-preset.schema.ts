import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserPresetDocument = UserPreset & Document;

@Schema({ timestamps: true, collection: 'user_presets' })
export class UserPreset {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  template!: string;
}

export const UserPresetSchema = SchemaFactory.createForClass(UserPreset);
