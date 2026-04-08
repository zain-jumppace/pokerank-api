import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IdealCounterDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  types!: string[];

  @ApiPropertyOptional()
  spriteUrl?: string;

  @ApiPropertyOptional()
  quickMove?: string;

  @ApiPropertyOptional()
  chargedMove?: string;

  @ApiProperty()
  dps!: number;

  @ApiPropertyOptional()
  survivePercent?: number;

  @ApiPropertyOptional()
  effectivenessPercent?: number;
}

export class PotentialFormDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  overallRank?: number;

  @ApiPropertyOptional()
  typeRank?: number;
}

export class BossRankingDto {
  @ApiProperty()
  overallRank!: number;

  @ApiPropertyOptional()
  typeRank?: number;
}

export class SuggestedTeamMemberDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  spriteUrl?: string;
}

export class RaidBossListDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  pokemonName!: string;

  @ApiPropertyOptional({ type: [String] })
  pokemonTypes?: string[];

  @ApiProperty()
  tier!: number;

  @ApiProperty()
  starRating!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  cp?: number;

  @ApiPropertyOptional()
  spriteUrl?: string;

  @ApiProperty({ type: [String] })
  weaknesses!: string[];

  @ApiProperty()
  dps!: number;

  @ApiProperty()
  tdo!: number;

  @ApiProperty()
  ivSpread!: string;

  @ApiProperty()
  league!: string;

  @ApiPropertyOptional()
  evolutions?: string;
}

export class RaidBossDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  pokemonName!: string;

  @ApiPropertyOptional({ type: [String] })
  pokemonTypes?: string[];

  @ApiProperty()
  tier!: number;

  @ApiProperty()
  starRating!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  cp?: number;

  @ApiPropertyOptional()
  spriteUrl?: string;

  @ApiProperty({ type: [String] })
  quickMoves!: string[];

  @ApiProperty({ type: [String] })
  chargedMoves!: string[];

  @ApiProperty()
  catchCp!: number;

  @ApiProperty()
  weatherBoostedCatchCp!: number;

  @ApiProperty({ type: BossRankingDto })
  currentRankings!: BossRankingDto;

  @ApiProperty()
  league!: string;

  @ApiProperty({ type: [PotentialFormDto] })
  potentialForms!: PotentialFormDto[];

  @ApiProperty({ type: [String] })
  allWeaknesses!: string[];

  @ApiProperty({ type: [IdealCounterDto] })
  idealCounters!: IdealCounterDto[];

  @ApiProperty({ type: [SuggestedTeamMemberDto] })
  suggestedTeam!: SuggestedTeamMemberDto[];
}
