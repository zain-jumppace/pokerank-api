import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ContentSlug } from '../schemas/app-content.schema.js';

export class CreateContentDto {
  @ApiProperty({ enum: ContentSlug, example: 'terms-and-conditions' })
  @IsEnum(ContentSlug)
  slug!: string;

  @ApiProperty({ example: 'Terms & Conditions' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '<p>Full terms content here...</p>' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ example: ['https://instagram.com/pokerank'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  socialLinks?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateContentDto {
  @ApiPropertyOptional({ example: 'Terms & Conditions' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '<p>Updated content...</p>' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: ['https://instagram.com/pokerank'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  socialLinks?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class ContentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional()
  socialLinks?: string[];

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  updatedAt!: string;
}
