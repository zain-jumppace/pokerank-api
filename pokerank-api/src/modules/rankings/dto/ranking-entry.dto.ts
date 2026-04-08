import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RankingEntryDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiPropertyOptional()
  pokemonName?: string;

  @ApiPropertyOptional({ type: [String] })
  pokemonTypes?: string[];

  @ApiPropertyOptional()
  spriteUrl?: string;

  @ApiProperty()
  league!: string;

  @ApiProperty()
  mode!: string;

  @ApiProperty()
  rank!: number;

  @ApiProperty()
  dps!: number;

  @ApiProperty()
  tdo!: number;

  @ApiPropertyOptional()
  statProduct?: number;

  @ApiPropertyOptional()
  movesetEfficiency?: number;

  @ApiPropertyOptional()
  role?: string;

  @ApiPropertyOptional()
  bestMoveset?: string;

  @ApiPropertyOptional()
  bestSpread?: string;
}

export class MovesetEffectivenessDto {
  @ApiProperty()
  moveset!: string;

  @ApiProperty()
  effectiveness!: number;
}

export class RankingTrendPointDto {
  @ApiProperty()
  label!: string;

  @ApiProperty()
  rank!: number;

  @ApiPropertyOptional()
  delta?: number;
}

export class CounterDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  spriteUrl?: string;
}

export class RankingDetailDto extends RankingEntryDto {
  @ApiProperty()
  overallRank!: number;

  @ApiPropertyOptional()
  typeRank?: number;

  @ApiProperty()
  damagePerSecond!: number;

  @ApiProperty()
  totalDamageOutput!: number;

  @ApiProperty()
  bestIvSpread!: string;

  @ApiProperty({ type: [RankingTrendPointDto] })
  rankingTrends!: RankingTrendPointDto[];

  @ApiProperty({ type: [CounterDto] })
  topCounters!: CounterDto[];

  @ApiProperty({ type: [MovesetEffectivenessDto] })
  movesetEffectiveness!: MovesetEffectivenessDto[];
}
