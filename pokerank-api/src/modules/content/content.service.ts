import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AppContent,
  AppContentDocument,
} from './schemas/app-content.schema.js';
import {
  ContentResponseDto,
  CreateContentDto,
  UpdateContentDto,
} from './dto/content.dto.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(AppContent.name)
    private readonly contentModel: Model<AppContentDocument>,
  ) {}

  async getBySlug(slug: string): Promise<ContentResponseDto> {
    const doc = await this.contentModel
      .findOne({ slug, isPublished: true })
      .exec();
    if (!doc) {
      throw new NotFoundException({
        message: `Content '${slug}' not found`,
        code: ERROR_CODES.CONTENT_NOT_FOUND,
      });
    }
    return this.mapToDto(doc);
  }

  async getAll(): Promise<ContentResponseDto[]> {
    const docs = await this.contentModel.find().sort({ slug: 1 }).exec();
    return docs.map((d) => this.mapToDto(d));
  }

  async create(dto: CreateContentDto): Promise<ContentResponseDto> {
    const existing = await this.contentModel.findOne({ slug: dto.slug }).exec();
    if (existing) {
      throw new ConflictException({
        message: `Content with slug '${dto.slug}' already exists`,
        code: ERROR_CODES.CONTENT_SLUG_EXISTS,
      });
    }
    const doc = await this.contentModel.create(dto);
    return this.mapToDto(doc);
  }

  async update(
    slug: string,
    dto: UpdateContentDto,
  ): Promise<ContentResponseDto> {
    const doc = await this.contentModel
      .findOneAndUpdate({ slug }, dto, { new: true })
      .exec();
    if (!doc) {
      throw new NotFoundException({
        message: `Content '${slug}' not found`,
        code: ERROR_CODES.CONTENT_NOT_FOUND,
      });
    }
    return this.mapToDto(doc);
  }

  async delete(slug: string): Promise<void> {
    const result = await this.contentModel.deleteOne({ slug }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException({
        message: `Content '${slug}' not found`,
        code: ERROR_CODES.CONTENT_NOT_FOUND,
      });
    }
  }

  private mapToDto(doc: AppContentDocument): ContentResponseDto {
    const obj = doc.toObject ? doc.toObject() : doc;
    return {
      id: (obj._id as any).toString(),
      slug: obj.slug,
      title: obj.title,
      body: obj.body,
      socialLinks: obj.socialLinks,
      isPublished: obj.isPublished,
      updatedAt: (obj as any).updatedAt?.toISOString?.() ?? '',
    };
  }
}
