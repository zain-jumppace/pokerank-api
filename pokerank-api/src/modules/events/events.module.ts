import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsController } from './events.controller.js';
import { EventsAdminController } from './events-admin.controller.js';
import { EventsService } from './events.service.js';
import { EventsRepository } from './events.repository.js';
import { GameEvent, GameEventSchema } from './schemas/event.schema.js';
import {
  EventAuditLog,
  EventAuditLogSchema,
} from './schemas/event-audit-log.schema.js';

@Module({
  imports: [
    CacheModule.register(),
    MongooseModule.forFeature([
      { name: GameEvent.name, schema: GameEventSchema },
      { name: EventAuditLog.name, schema: EventAuditLogSchema },
    ]),
  ],
  controllers: [EventsController, EventsAdminController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService],
})
export class EventsModule {}
