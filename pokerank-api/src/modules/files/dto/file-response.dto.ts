import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  fileType!: string;

  @ApiProperty({ example: 'profiles' })
  category!: string;

  @ApiProperty()
  fileSize!: number;

  @ApiProperty({ example: 'http://localhost:3000/uploads/profiles/abc123.jpg' })
  url!: string;

  @ApiProperty({ example: 'local', enum: ['local', 's3'] })
  storageType!: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt!: string;
}
