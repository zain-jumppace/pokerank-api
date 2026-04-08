import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  FileRecord,
  FileDocument,
  FileCategory,
  StorageType,
} from './schemas/file.schema.js';
import { FileResponseDto } from './dto/file-response.dto.js';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(
    @InjectModel(FileRecord.name)
    private readonly fileModel: Model<FileDocument>,
    private readonly configService: ConfigService,
  ) {
    const rawDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.uploadDir = path.isAbsolute(rawDir)
      ? rawDir
      : path.join(process.cwd(), rawDir);

    const port = this.configService.get<number>('PORT', 3000);
    this.baseUrl = this.configService.get<string>(
      'APP_BASE_URL',
      `http://localhost:${port}`,
    );

    for (const sub of Object.values(FileCategory)) {
      this.ensureDirectoryExists(path.join(this.uploadDir, sub));
    }
  }

  async uploadFileAndReturnDoc(
    userId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    category: FileCategory,
  ): Promise<FileDocument> {
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new BadRequestException({
        message: `File type '${mimeType}' not allowed. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        code: 'FILE_TYPE_NOT_ALLOWED',
      });
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException({
        message: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        code: 'FILE_TOO_LARGE',
      });
    }

    const ext = path.extname(fileName) || this.getExtFromMime(mimeType);
    const uniqueName = `${uuidv4()}${ext}`;
    const relativePath = `${category}/${uniqueName}`;
    const absolutePath = path.join(this.uploadDir, relativePath);

    this.ensureDirectoryExists(path.dirname(absolutePath));
    await fsp.writeFile(absolutePath, fileBuffer);

    const fileUrl = `${this.baseUrl}/uploads/${relativePath}`;

    const doc = await this.fileModel.create({
      userId: new Types.ObjectId(userId),
      fileName,
      fileType: mimeType,
      category,
      fileSize: fileBuffer.length,
      localPath: `uploads/${relativePath}`,
      url: fileUrl,
      storageType: StorageType.LOCAL,
    });

    this.logger.log(`File uploaded: ${relativePath} (${(fileBuffer.length / 1024).toFixed(1)}KB) by user ${userId}`);

    return doc;
  }

  async uploadFile(
    userId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    category: FileCategory,
  ): Promise<FileResponseDto> {
    const doc = await this.uploadFileAndReturnDoc(userId, fileBuffer, fileName, mimeType, category);
    return this.mapToDto(doc);
  }

  async findById(fileId: string): Promise<FileDocument | null> {
    return this.fileModel
      .findOne({ _id: fileId, isDeleted: false, isActive: true })
      .exec();
  }

  async findByIdOrThrow(fileId: string): Promise<FileDocument> {
    const file = await this.findById(fileId);
    if (!file) {
      throw new NotFoundException({
        message: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }
    return file;
  }

  async findByUser(userId: string, category?: FileCategory): Promise<FileResponseDto[]> {
    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
      isActive: true,
    };
    if (category) query.category = category;

    const files = await this.fileModel.find(query).sort({ createdAt: -1 }).exec();
    return files.map((f) => this.mapToDto(f));
  }

  async softDelete(fileId: string, userId: string): Promise<void> {
    const file = await this.fileModel.findOne({
      _id: fileId,
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    }).exec();

    if (!file) {
      throw new NotFoundException({
        message: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    await this.fileModel.updateOne(
      { _id: file._id },
      { isDeleted: true, isActive: false, deletedAt: new Date() },
    );
  }

  async hardDeleteByIdIfExists(fileId: Types.ObjectId): Promise<void> {
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) return;

    if (file.localPath) {
      const abs = path.join(process.cwd(), file.localPath);
      try {
        await fsp.unlink(abs);
        this.logger.log(`Deleted file from disk: ${file.localPath}`);
      } catch {
        this.logger.warn(`Could not delete file from disk: ${file.localPath}`);
      }
    }

    await this.fileModel.deleteOne({ _id: file._id });
  }

  mapToDto(doc: FileDocument): FileResponseDto {
    const obj = doc.toObject ? doc.toObject() : doc;
    return {
      id: (obj._id as any).toString(),
      fileName: obj.fileName,
      fileType: obj.fileType,
      category: obj.category,
      fileSize: obj.fileSize,
      url: obj.url || obj.s3Url || '',
      storageType: obj.storageType,
      metadata: obj.metadata,
      createdAt: (obj as any).createdAt?.toISOString?.() ?? '',
    };
  }

  private getExtFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
    };
    return map[mime] || '.bin';
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
