import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MoveDto {
  @ApiProperty()
  moveId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  power!: number;

  @ApiProperty()
  energy!: number;

  @ApiProperty()
  dps!: number;

  @ApiPropertyOptional()
  isElite?: boolean;
}

export class TypeEffectivenessDto {
  @ApiProperty({ type: [String] })
  weakTo!: string[];

  @ApiProperty({ type: [String] })
  resistantTo!: string[];

  @ApiProperty({ type: [String] })
  immuneTo!: string[];
}

export class LeagueRankingDto {
  @ApiProperty()
  league!: string;

  @ApiProperty()
  rank!: number;

  @ApiProperty()
  dps!: number;

  @ApiPropertyOptional()
  rating?: string;
}

export class EvolutionStageDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  spriteUrl?: string;

  @ApiProperty()
  generation!: number;

  @ApiProperty()
  baseStatsTotal!: number;

  @ApiPropertyOptional()
  candyCost?: number;

  @ApiPropertyOptional()
  conditions?: string;

  @ApiProperty()
  stageLabel!: string;

  @ApiProperty({ type: [LeagueRankingDto] })
  rankings!: LeagueRankingDto[];
}

export class BestUseCaseDto {
  @ApiProperty()
  category!: string;

  @ApiProperty()
  rating!: number;
}

export class PokemonDetailDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  types!: string[];

  @ApiProperty()
  baseAtk!: number;

  @ApiProperty()
  baseDef!: number;

  @ApiProperty()
  baseSta!: number;

  @ApiProperty()
  totalStats!: number;

  @ApiProperty()
  maxCp!: number;

  @ApiProperty()
  statProduct!: number;

  @ApiPropertyOptional()
  generation?: number;

  @ApiPropertyOptional()
  region?: string;

  @ApiPropertyOptional()
  spriteUrl?: string;

  @ApiPropertyOptional()
  flavorText?: string;

  @ApiProperty({ type: [MoveDto] })
  fastMoves!: MoveDto[];

  @ApiProperty({ type: [MoveDto] })
  chargeMoves!: MoveDto[];

  @ApiProperty({ type: TypeEffectivenessDto })
  typeEffectiveness!: TypeEffectivenessDto;

  @ApiProperty({ type: [EvolutionStageDto] })
  evolutionChain!: EvolutionStageDto[];

  @ApiProperty({ type: [LeagueRankingDto] })
  rankings!: LeagueRankingDto[];

  @ApiProperty({ type: [BestUseCaseDto] })
  bestUseCases!: BestUseCaseDto[];

  @ApiPropertyOptional()
  prevId?: number;

  @ApiPropertyOptional()
  nextId?: number;
}

export class PokemonListItemDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  types!: string[];

  @ApiProperty()
  baseAtk!: number;

  @ApiProperty()
  baseDef!: number;

  @ApiProperty()
  baseSta!: number;

  @ApiPropertyOptional()
  spriteUrl?: string;
}

export class TrendingPokemonDto extends PokemonListItemDto {
  @ApiProperty()
  overallRanking!: number;

  @ApiProperty()
  league!: string;
}

export class PokemonNeighborsDto {
  @ApiPropertyOptional()
  prev?: PokemonListItemDto;

  @ApiPropertyOptional()
  next?: PokemonListItemDto;
}
