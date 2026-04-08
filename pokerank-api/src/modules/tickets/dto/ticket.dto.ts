import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TicketStatus } from '../schemas/ticket.schema.js';

export class CreateTicketDto {
  @ApiProperty({ example: 'App crashes on Pokédex screen' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'When I open Pokédex and scroll, the app freezes...' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;
}

export class AdminReplyDto {
  @ApiProperty({ example: 'We are looking into this issue. Thank you for reporting.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus, example: 'resolved' })
  @IsEnum(TicketStatus)
  status!: string;
}

export class TicketFilterDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: string;
}

export class TicketReplyResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  isAdmin!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class AttachmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  fileType!: string;

  @ApiProperty()
  url!: string;
}

export class TicketResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: TicketStatus })
  status!: string;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({ type: [TicketReplyResponseDto] })
  replies?: TicketReplyResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AdminTicketResponseDto extends TicketResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  userEmail?: string;
}
