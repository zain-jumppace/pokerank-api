import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppContentDocument = AppContent & Document;

export enum ContentSlug {
  TERMS_AND_CONDITIONS = 'terms-and-conditions',
  PRIVACY_POLICY = 'privacy-policy',
  HELP_INSTRUCTIONS = 'help-instructions',
}

@Schema({ timestamps: true, collection: 'app_content' })
export class AppContent {
  @Prop({ required: true, unique: true, enum: ContentSlug, index: true })
  slug!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: [String], default: [] })
  socialLinks!: string[];

  @Prop({ default: true })
  isPublished!: boolean;
}

export const AppContentSchema = SchemaFactory.createForClass(AppContent);
