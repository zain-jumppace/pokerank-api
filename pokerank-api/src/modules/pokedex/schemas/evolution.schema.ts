import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EvolutionDocument = Evolution & Document;

@Schema({ timestamps: true, collection: 'evolutions' })
export class Evolution {
  @Prop({ required: true, index: true })
  fromPokemonId!: number;

  @Prop({ required: true, index: true })
  toPokemonId!: number;

  @Prop()
  candyCost?: number;

  @Prop()
  conditions?: string;
}

export const EvolutionSchema = SchemaFactory.createForClass(Evolution);
