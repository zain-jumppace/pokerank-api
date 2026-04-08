import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PokemonMoveDocument = PokemonMove & Document;

@Schema({ timestamps: true, collection: 'pokemon_moves' })
export class PokemonMove {
  @Prop({ required: true, index: true })
  pokemonId!: number;

  @Prop({ required: true, index: true })
  moveId!: number;

  @Prop({ required: true, enum: ['fast', 'charge', 'elite'] })
  moveSlot!: string;
}

export const PokemonMoveSchema = SchemaFactory.createForClass(PokemonMove);
PokemonMoveSchema.index({ pokemonId: 1, moveId: 1 }, { unique: true });
