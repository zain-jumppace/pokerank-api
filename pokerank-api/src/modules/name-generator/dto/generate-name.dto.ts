import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GenerateNameDto {
  @ApiProperty({ example: '{Species}_{IV}_{League}' })
  @IsString()
  template!: string;

  @ApiProperty({ example: 94 })
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  pokemonId!: number;

  @ApiPropertyOptional({ example: 98 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(0)
  @Max(100)
  ivPercent?: number;

  @ApiPropertyOptional({ example: '15/14/15', description: 'ATK/DEF/STA IV spread' })
  @IsOptional()
  @IsString()
  ivSpread?: string;

  @ApiPropertyOptional({ enum: ['great', 'ultra', 'master'] })
  @IsOptional()
  @IsString()
  league?: string;

  @ApiPropertyOptional({ enum: ['attacker', 'tank', 'support'] })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'Fire Spin', description: 'Fast move name abbreviation' })
  @IsOptional()
  @IsString()
  fastMove?: string;

  @ApiPropertyOptional({ example: 'Blast Burn', description: 'Charge move name abbreviation' })
  @IsOptional()
  @IsString()
  chargeMove?: string;

  @ApiPropertyOptional({ example: 1, description: 'Meta ranking number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  rank?: number;

  @ApiPropertyOptional({ example: 1500, description: 'Current CP' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  cp?: number;
}

export class GenerateNameResponseDto {
  @ApiProperty()
  generatedName!: string;

  @ApiPropertyOptional()
  pokemonName?: string;
}
