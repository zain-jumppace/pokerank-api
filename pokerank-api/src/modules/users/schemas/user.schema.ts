import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum SocialProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
  GITHUB = 'github',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop()
  passwordHash?: string;

  @Prop({ required: true, enum: ['user', 'admin'], default: 'user' })
  role!: string;

  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Prop({ default: false })
  isProfileComplete!: boolean;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ type: Types.ObjectId, ref: 'FileRecord' })
  profileImage?: Types.ObjectId;

  @Prop({ default: 'free' })
  subscriptionTier?: string;

  @Prop({ enum: SocialProvider })
  socialProvider?: SocialProvider;

  @Prop({ index: true })
  socialProviderId?: string;

  @Prop()
  socialPhotoUrl?: string;

  @Prop({ default: true })
  notificationsEnabled!: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
