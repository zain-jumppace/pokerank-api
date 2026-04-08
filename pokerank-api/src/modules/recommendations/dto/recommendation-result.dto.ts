import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecommendationCostDto {
  @ApiProperty({ example: 75000, description: 'Stardust required' })
  stardust!: number;

  @ApiProperty({ example: 66, description: 'Candy required' })
  candy!: number;

  @ApiPropertyOptional({
    example: 'Hundo (125)',
    description: 'Label for candy display, e.g. "Hundo (125)"',
  })
  candyLabel?: string;
}

export class RecommendationResultDto {
  @ApiProperty()
  pokemonId!: number;

  @ApiPropertyOptional()
  pokemonName?: string;

  @ApiPropertyOptional()
  spriteUrl?: string;

  @ApiProperty({ enum: ['EVOLVE', 'POWER_UP'] })
  action!: string;

  @ApiProperty()
  reasoning!: string;

  @ApiPropertyOptional()
  estimatedCp?: number;

  @ApiPropertyOptional()
  league?: string;

  @ApiPropertyOptional()
  metaRank?: number;

  @ApiPropertyOptional({
    description: 'Estimated resource cost for this action',
    type: RecommendationCostDto,
  })
  cost?: RecommendationCostDto;

  @ApiPropertyOptional({
    description: 'IV percentage (0–100)',
    example: 98,
  })
  ivPercent?: number;
}
