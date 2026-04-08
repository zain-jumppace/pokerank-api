import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentController } from './content.controller.js';
import { ContentService } from './content.service.js';
import {
  AppContent,
  AppContentSchema,
} from './schemas/app-content.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppContent.name, schema: AppContentSchema },
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
