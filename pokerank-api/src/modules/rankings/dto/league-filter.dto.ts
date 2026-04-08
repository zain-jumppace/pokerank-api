import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class LeagueFilterDto extends PaginationQueryDto {
  @ApiProperty({ enum: ['great', 'ultra', 'master'] })
  @IsEnum(['great', 'ultra', 'master'])
  league!: string;

  @ApiProperty({ enum: ['pve', 'pvp'] })
  @IsEnum(['pve', 'pvp'])
  mode!: string;

  @ApiPropertyOptional({
    enum: ['metaRelevance', 'dps', 'tdo', 'movesetEfficiency'],
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ enum: ['attacker', 'tank', 'support'] })
  @IsOptional()
  @IsString()
  role?: string;
}
