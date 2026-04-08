import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailService } from './email.service.js';
import { FirebaseAdminService } from './firebase-admin.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { UsersService } from '../users/users.service.js';
import { FilesModule } from '../files/files.module.js';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema.js';
import { OtpCode, OtpCodeSchema } from './schemas/otp-code.schema.js';

@Module({
  imports: [
    UsersModule,
    FilesModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default-secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRY', '15m') as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: OtpCode.name, schema: OtpCodeSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, FirebaseAdminService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.configService.get<string>('ADMIN_SEED_EMAIL');
    const password = this.configService.get<string>('ADMIN_SEED_PASSWORD');
    if (email && password) {
      await this.usersService.seedAdmin(email, password);
    }
  }
}
