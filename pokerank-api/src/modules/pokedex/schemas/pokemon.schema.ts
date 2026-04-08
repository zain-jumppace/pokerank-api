import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PokemonDocument = Pokemon & Document;

@Schema({ timestamps: true, collection: 'pokemon' })
export class Pokemon {
  @Prop({ required: true, unique: true, index: true })
  pokemonId!: number;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ type: [String], required: true })
  types!: string[];

  @Prop({ required: true })
  baseAtk!: number;

  @Prop({ required: true })
  baseDef!: number;

  @Prop({ required: true })
  baseSta!: number;

  @Prop()
  generation?: number;

  @Prop()
  region?: string;

  @Prop()
  spriteUrl?: string;

  @Prop()
  flavorText?: string;

  @Prop()
  evolutionChainId?: number;
}

export const PokemonSchema = SchemaFactory.createForClass(Pokemon);
PokemonSchema.index({ name: 'text' });
PokemonSchema.index({ generation: 1 });
PokemonSchema.index({ types: 1 });
