import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ContentService } from './content.service.js';
import {
  ContentResponseDto,
  CreateContentDto,
  UpdateContentDto,
} from './dto/content.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Content')
@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Public()
  @Get('content/:slug')
  @ApiOperation({ summary: 'Get published content by slug (terms-and-conditions, privacy-policy, help-instructions)' })
  async getBySlug(
    @Param('slug') slug: string,
  ): Promise<ContentResponseDto> {
    return this.contentService.getBySlug(slug);
  }

  // ── Admin CRUD ────────────────────────────────

  @ApiBearerAuth('Bearer')
  @Roles('admin')
  @Get('admin/content')
  @ApiOperation({ summary: 'List all content pages (admin)' })
  async getAll(): Promise<ContentResponseDto[]> {
    return this.contentService.getAll();
  }

  @ApiBearerAuth('Bearer')
  @Roles('admin')
  @Post('admin/content')
  @ApiOperation({ summary: 'Create a content page (admin)' })
  async create(@Body() dto: CreateContentDto): Promise<ContentResponseDto> {
    return this.contentService.create(dto);
  }

  @ApiBearerAuth('Bearer')
  @Roles('admin')
  @Patch('admin/content/:slug')
  @ApiOperation({ summary: 'Update a content page by slug (admin)' })
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateContentDto,
  ): Promise<ContentResponseDto> {
    return this.contentService.update(slug, dto);
  }

  @ApiBearerAuth('Bearer')
  @Roles('admin')
  @Delete('admin/content/:slug')
  @ApiOperation({ summary: 'Delete a content page by slug (admin)' })
  async delete(@Param('slug') slug: string): Promise<{ message: string }> {
    await this.contentService.delete(slug);
    return { message: 'Content deleted successfully' };
  }
}
