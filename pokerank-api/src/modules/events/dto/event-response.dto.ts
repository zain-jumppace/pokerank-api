import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  internalId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  bannerImageUrl?: string;

  @ApiProperty({ type: [Object] })
  bonuses!: Array<{ label: string; icon?: string }>;

  @ApiProperty({ type: [Number] })
  featuredPokemonIds!: number[];

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiPropertyOptional()
  timezone?: string;

  @ApiProperty()
  visibility!: string;

  @ApiProperty()
  priority!: number;
}

export class AuditLogEntryDto {
  @ApiProperty()
  adminUserId!: string;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional()
  before?: Record<string, any>;

  @ApiPropertyOptional()
  after?: Record<string, any>;

  @ApiProperty()
  timestamp!: string;
}
