import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class HistoryFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['S', 'A', 'B', 'C', 'D'] })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional({ enum: ['great', 'ultra', 'master'] })
  @IsOptional()
  @IsString()
  league?: string;
}

export class HistoryStatsDto {
  @ApiProperty()
  teamsCount!: number;

  @ApiProperty()
  pokemonCount!: number;

  @ApiProperty()
  avgTeamSize!: number;
}

export class HistoryEntryDto {
  @ApiProperty()
  id!: string;

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

  @ApiPropertyOptional()
  metaRank?: number;

  @ApiPropertyOptional()
  tier?: string;

  @ApiPropertyOptional()
  ivPercent?: number;

  @ApiPropertyOptional()
  ivSpread?: string;

  @ApiPropertyOptional()
  cp?: number;

  @ApiPropertyOptional()
  dps?: number;

  @ApiPropertyOptional()
  tdo?: number;

  @ApiProperty()
  analyzedAt!: string;
}

export class IvBreakdownDto {
  @ApiProperty()
  attack!: number;

  @ApiProperty()
  defense!: number;

  @ApiProperty()
  hp!: number;
}

export class TrendPointDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  rank!: number;
}

export class HistoryDetailDto extends HistoryEntryDto {
  @ApiProperty({ type: IvBreakdownDto })
  ivBreakdown!: IvBreakdownDto;

  @ApiProperty({ type: [TrendPointDto] })
  rankTrend!: TrendPointDto[];

  @ApiProperty({ type: [String] })
  notes!: string[];
}

export class TeamMemberDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ type: [String] })
  types?: string[];

  @ApiPropertyOptional()
  spriteUrl?: string;
}

export class SavedTeamDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bossName!: string;

  @ApiProperty()
  bossId!: string;

  @ApiProperty()
  pokemonCount!: number;

  @ApiProperty({ type: [TeamMemberDto] })
  members!: TeamMemberDto[];

  @ApiProperty()
  createdAt!: string;
}
