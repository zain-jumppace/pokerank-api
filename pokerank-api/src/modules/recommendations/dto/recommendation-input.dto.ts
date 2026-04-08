import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OwnedPokemonDto {
  @ApiProperty({ example: 147 })
  @IsInt()
  pokemonId!: number;

  @ApiProperty({ example: 15 })
  @IsInt()
  @Min(0)
  ivAtk!: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(0)
  ivDef!: number;

  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(0)
  ivSta!: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(1)
  currentLevel!: number;

  @ApiPropertyOptional({ example: 1500, description: 'Current combat power' })
  @IsOptional()
  @IsInt()
  @Min(0)
  combatPower?: number;

  @ApiPropertyOptional({ example: 124, description: 'Available candy count for this Pokémon' })
  @IsOptional()
  @IsInt()
  @Min(0)
  candyCount?: number;
}

export class RecommendationInputDto {
  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(0)
  stardust!: number;

  @ApiProperty({ type: [OwnedPokemonDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OwnedPokemonDto)
  ownedPokemon!: OwnedPokemonDto[];
}
