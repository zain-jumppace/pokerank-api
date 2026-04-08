import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({ type: PaginationMeta })
  meta?: PaginationMeta;

  @ApiProperty()
  timestamp!: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  data!: T[];

  @ApiProperty({ type: PaginationMeta })
  meta!: PaginationMeta;

  @ApiProperty()
  timestamp!: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty()
  error!: {
    statusCode: number;
    message: string;
    code?: string;
  };

  @ApiProperty()
  timestamp!: string;
}
