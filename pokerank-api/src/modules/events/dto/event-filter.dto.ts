import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class EventFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'upcoming', 'all'], default: 'all' })
  @IsOptional()
  @IsEnum(['active', 'upcoming', 'all'])
  status?: string = 'all';
}
