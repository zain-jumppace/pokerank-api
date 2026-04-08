import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { FilesService } from './files.service.js';
import { FileResponseDto } from './dto/file-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { FileCategory } from './schemas/file.schema.js';

@ApiTags('Files')
@ApiBearerAuth('Bearer')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @SkipThrottle()
  @ApiOperation({ summary: 'Upload a file (image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: ['profiles', 'general'],
          default: 'profiles',
        },
      },
    },
  })
  async upload(
    @CurrentUser('userId') userId: string,
    @Req() req: FastifyRequest,
  ): Promise<FileResponseDto> {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException({
        message: 'No file uploaded. Send a multipart/form-data request with a "file" field.',
        code: 'FILE_UPLOAD_FAILED',
      });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    if (data.file.truncated) {
      throw new BadRequestException({
        message: 'File exceeds the maximum allowed size of 5MB',
        code: 'FILE_TOO_LARGE',
      });
    }

    const category = (data.fields?.category as any)?.value || FileCategory.PROFILES;

    return this.filesService.uploadFile(
      userId,
      buffer,
      data.filename,
      data.mimetype,
      category as FileCategory,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List my uploaded files' })
  @ApiQuery({ name: 'category', required: false, enum: ['profiles', 'general'] })
  async listMyFiles(
    @CurrentUser('userId') userId: string,
    @Query('category') category?: FileCategory,
  ): Promise<FileResponseDto[]> {
    return this.filesService.findByUser(userId, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  async getFile(@Param('id') id: string): Promise<FileResponseDto> {
    const file = await this.filesService.findByIdOrThrow(id);
    return this.filesService.mapToDto(file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a file' })
  async deleteFile(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.filesService.softDelete(id, userId);
    return { message: 'File deleted successfully' };
  }
}
