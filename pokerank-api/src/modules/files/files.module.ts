import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { FileRecord, FileSchema } from './schemas/file.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FileRecord.name, schema: FileSchema }]),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
