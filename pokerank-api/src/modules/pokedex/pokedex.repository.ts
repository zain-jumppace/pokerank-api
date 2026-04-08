import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Pokemon, PokemonDocument } from './schemas/pokemon.schema.js';
import {
  PokemonMove,
  PokemonMoveDocument,
} from './schemas/pokemon-move.schema.js';
import { Move, MoveDocument } from './schemas/move.schema.js';
import { Evolution, EvolutionDocument } from './schemas/evolution.schema.js';
import { PokemonFilterDto } from './dto/pokemon-filter.dto.js';

@Injectable()
export class PokedexRepository {
  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<PokemonDocument>,
    @InjectModel(Move.name) private readonly moveModel: Model<MoveDocument>,
    @InjectModel(PokemonMove.name)
    private readonly pokemonMoveModel: Model<PokemonMoveDocument>,
    @InjectModel(Evolution.name)
    private readonly evolutionModel: Model<EvolutionDocument>,
  ) {}

  async findAll(
    filter: PokemonFilterDto,
  ): Promise<{ data: PokemonDocument[]; total: number }> {
    const query: FilterQuery<PokemonDocument> = {};

    if (filter.type) {
      query.types = filter.type.toLowerCase();
    }
    if (filter.region) {
      query.region = filter.region;
    }
    if (filter.generation) {
      query.generation = filter.generation;
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.pokemonModel
        .find(query)
        .sort({ pokemonId: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.pokemonModel.countDocuments(query),
    ]);

    return { data: data as unknown as PokemonDocument[], total };
  }

  async findByPokemonId(pokemonId: number): Promise<PokemonDocument | null> {
    return this.pokemonModel
      .findOne({ pokemonId })
      .lean() as Promise<PokemonDocument | null>;
  }

  async findByPokemonIds(pokemonIds: number[]): Promise<PokemonDocument[]> {
    return this.pokemonModel
      .find({ pokemonId: { $in: pokemonIds } })
      .lean() as unknown as Promise<PokemonDocument[]>;
  }

  async findByName(query: string): Promise<PokemonDocument[]> {
    return this.pokemonModel
      .find({ name: { $regex: query, $options: 'i' } })
      .sort({ pokemonId: 1 })
      .limit(20)
      .lean() as unknown as Promise<PokemonDocument[]>;
  }

  async findNeighbors(
    pokemonId: number,
  ): Promise<{ prev: PokemonDocument | null; next: PokemonDocument | null }> {
    const [prev, next] = await Promise.all([
      this.pokemonModel
        .findOne({ pokemonId: { $lt: pokemonId } })
        .sort({ pokemonId: -1 })
        .lean() as Promise<PokemonDocument | null>,
      this.pokemonModel
        .findOne({ pokemonId: { $gt: pokemonId } })
        .sort({ pokemonId: 1 })
        .lean() as Promise<PokemonDocument | null>,
    ]);
    return { prev, next };
  }

  async findMovesByPokemonId(
    pokemonId: number,
  ): Promise<Array<MoveDocument & { moveSlot: string }>> {
    const pokemonMoves = await this.pokemonMoveModel.find({ pokemonId }).lean();
    const moveIds = pokemonMoves.map((pm) => pm.moveId);
    const moves = await this.moveModel
      .find({ moveId: { $in: moveIds } })
      .lean();

    return pokemonMoves.map((pm) => {
      const move = moves.find((m) => m.moveId === pm.moveId);
      return { ...move, moveSlot: pm.moveSlot } as MoveDocument & {
        moveSlot: string;
      };
    });
  }

  async findEvolutionsByPokemonId(
    pokemonId: number,
  ): Promise<EvolutionDocument[]> {
    return this.evolutionModel
      .find({
        $or: [{ fromPokemonId: pokemonId }, { toPokemonId: pokemonId }],
      })
      .lean() as unknown as Promise<EvolutionDocument[]>;
  }

  async findByEvolutionChainId(chainId: number): Promise<PokemonDocument[]> {
    return this.pokemonModel
      .find({ evolutionChainId: chainId })
      .sort({ pokemonId: 1 })
      .lean() as unknown as Promise<PokemonDocument[]>;
  }

  async findEvolutionsByChain(pokemonIds: number[]): Promise<EvolutionDocument[]> {
    return this.evolutionModel
      .find({
        $or: [
          { fromPokemonId: { $in: pokemonIds } },
          { toPokemonId: { $in: pokemonIds } },
        ],
      })
      .lean() as unknown as Promise<EvolutionDocument[]>;
  }
}
