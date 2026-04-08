import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileDocument = FileRecord & Document;

export enum StorageType {
  LOCAL = 'local',
  S3 = 's3',
}

export enum FileCategory {
  PROFILES = 'profiles',
  GENERAL = 'general',
  TICKETS = 'tickets',
}

@Schema({ timestamps: true, collection: 'files' })
export class FileRecord {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  fileType!: string;

  @Prop({ required: true, index: true, enum: FileCategory })
  category!: string;

  @Prop({ required: true })
  fileSize!: number;

  @Prop({ index: true })
  localPath?: string;

  @Prop({ index: true })
  url?: string;

  @Prop({ index: true })
  s3Key?: string;

  @Prop({ index: true })
  s3Url?: string;

  @Prop()
  s3Bucket?: string;

  @Prop()
  s3Region?: string;

  @Prop({ default: StorageType.LOCAL, enum: StorageType, index: true })
  storageType!: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const FileSchema = SchemaFactory.createForClass(FileRecord);

FileSchema.index({ userId: 1, category: 1 });
FileSchema.index({ isDeleted: 1 });
FileSchema.index({ isActive: 1, userId: 1 });
FileSchema.index({ createdAt: -1 });
