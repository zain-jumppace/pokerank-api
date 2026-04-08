import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export class EventBonus {
  @Prop({ required: true })
  label!: string;

  @Prop()
  icon?: string;
}

export type EventDocument = GameEvent & Document;

@Schema({ timestamps: true, collection: 'events' })
export class GameEvent {
  @Prop({ required: true, unique: true })
  internalId!: string;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop()
  bannerImageUrl?: string;

  @Prop({ type: [{ label: String, icon: String }], default: [] })
  bonuses!: EventBonus[];

  @Prop({ type: [Number], default: [] })
  featuredPokemonIds!: number[];

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop()
  timezone?: string;

  @Prop({
    required: true,
    enum: ['live', 'scheduled', 'hidden'],
    default: 'hidden',
  })
  visibility!: string;

  @Prop({ default: 0 })
  priority!: number;
}

export const GameEventSchema = SchemaFactory.createForClass(GameEvent);
GameEventSchema.index({ visibility: 1, startDate: 1 });
GameEventSchema.index({ startDate: 1, endDate: 1 });
