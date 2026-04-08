import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { Types } from 'mongoose';
import { AuthService } from './auth.service.js';
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResendOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/login.dto.js';
import { CreateProfileDto, UpdateProfileDto } from './dto/create-profile.dto.js';
import {
  AuthResponseDto,
  MessageResponseDto,
  RegisterResponseDto,
  UserProfileDto,
} from './dto/auth-response.dto.js';
import { SocialAuthDto, SocialAuthResponseDto } from './dto/social-auth.dto.js';
import {
  ChangePasswordDto,
  NotificationSettingsDto,
  UpdateNotificationDto,
} from './dto/settings.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';
import { FilesService } from '../files/files.service.js';
import { FileCategory } from '../files/schemas/file.schema.js';
import { OtpPurpose } from './schemas/otp-code.schema.js';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}

  // ──────────────────────────────────────────────
  // Registration Flow
  // ──────────────────────────────────────────────

  @Public()
  @Post('auth/register')
  @ApiOperation({ summary: 'Step 1 — Register with email & password, sends OTP' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto.email, dto.password);
  }

  @Public()
  @Post('auth/verify-otp')
  @ApiOperation({ summary: 'Step 2 — Verify email OTP, returns tokens + user' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const result = await this.authService.verifyRegistrationOtp(dto.email, dto.code);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: this.mapUserToProfile(result.user),
    };
  }

  @Public()
  @Post('auth/resend-otp')
  @ApiOperation({ summary: 'Resend OTP for email verification' })
  async resendOtp(@Body() dto: ResendOtpDto): Promise<MessageResponseDto> {
    return this.authService.resendOtp(dto.email, OtpPurpose.EMAIL_VERIFICATION);
  }

  @ApiBearerAuth('Bearer')
  @Post('auth/create-profile')
  @SkipThrottle()
  @ApiOperation({ summary: 'Step 3 — Complete profile (multipart: fields + optional image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['firstName', 'lastName'],
      properties: {
        firstName: { type: 'string', example: 'Hamza' },
        lastName: { type: 'string', example: 'Khan' },
        phoneNumber: { type: 'string', example: '+923001234567' },
        dateOfBirth: { type: 'string', example: '1998-05-15' },
        profileImage: { type: 'string', format: 'binary', description: 'Optional profile image' },
      },
    },
  })
  async createProfile(
    @CurrentUser('userId') userId: string,
    @Req() req: FastifyRequest,
  ): Promise<UserProfileDto> {
    const { fields, fileBuffer, fileName, mimeType } = await this.parseMultipart(req);

    const dto = new CreateProfileDto();
    dto.firstName = fields.firstName;
    dto.lastName = fields.lastName;
    if (fields.phoneNumber) dto.phoneNumber = fields.phoneNumber;
    if (fields.dateOfBirth) dto.dateOfBirth = fields.dateOfBirth;

    if (!dto.firstName || !dto.lastName) {
      throw new BadRequestException('firstName and lastName are required');
    }

    let profileImageId: Types.ObjectId | undefined;
    if (fileBuffer) {
      const fileDoc = await this.filesService.uploadFileAndReturnDoc(
        userId,
        fileBuffer,
        fileName!,
        mimeType!,
        FileCategory.PROFILES,
      );
      profileImageId = fileDoc._id as Types.ObjectId;
    }

    const user = await this.usersService.createProfile(userId, dto, profileImageId);
    return this.mapUserToProfile(user);
  }

  // ──────────────────────────────────────────────
  // Login
  // ──────────────────────────────────────────────

  @Public()
  @Post('auth/login')
  @ApiOperation({ summary: 'Login with email & password, returns tokens + full user' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto.email, dto.password);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: this.mapUserToProfile(result.user),
    };
  }

  // ──────────────────────────────────────────────
  // Social Auth (Firebase)
  // ──────────────────────────────────────────────

  @Public()
  @Post('auth/social')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Social login/register via Firebase (Google, Apple, GitHub)',
    description:
      'Frontend authenticates with Firebase, sends the idToken here. ' +
      'If user exists → login. If new → auto-register. Returns isNewUser flag.',
  })
  async socialAuth(@Body() dto: SocialAuthDto): Promise<SocialAuthResponseDto> {
    const result = await this.authService.socialLogin(dto.idToken, dto.provider);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: this.mapUserToProfile(result.user),
      isNewUser: result.isNewUser,
    };
  }

  // ──────────────────────────────────────────────
  // Forgot Password Flow
  // ──────────────────────────────────────────────

  @Public()
  @Post('auth/forgot-password')
  @ApiOperation({ summary: 'Step 1 — Send OTP for password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('auth/reset-password')
  @ApiOperation({ summary: 'Step 2 — Verify OTP & set new password' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto.email, dto.code, dto.newPassword);
  }

  // ──────────────────────────────────────────────
  // Token Management
  // ──────────────────────────────────────────────

  @Public()
  @Post('auth/refresh')
  @ApiOperation({ summary: 'Refresh access token, returns tokens + full user' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const result = await this.authService.refreshTokens(dto.refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: this.mapUserToProfile(result.user),
    };
  }

  @ApiBearerAuth('Bearer')
  @Post('auth/logout')
  @ApiOperation({
    summary: 'Logout — revoke current session (or all sessions)',
    description:
      'Send the refreshToken from the current session to revoke only that session. ' +
      'If refreshToken is omitted, ALL sessions for the user are revoked (logout everywhere).',
  })
  async logout(
    @CurrentUser('userId') userId: string,
    @Body() body: LogoutDto,
  ): Promise<MessageResponseDto> {
    await this.authService.logout(userId, body.refreshToken);
    return { message: 'Logged out successfully' };
  }

  // ──────────────────────────────────────────────
  // User Profile
  // ──────────────────────────────────────────────

  @ApiBearerAuth('Bearer')
  @Get('users/me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(
    @CurrentUser('userId') userId: string,
  ): Promise<UserProfileDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.mapUserToProfile(user);
  }

  @ApiBearerAuth('Bearer')
  @Patch('users/me')
  @SkipThrottle()
  @ApiOperation({ summary: 'Update user profile (multipart: fields + optional new image)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', example: 'Hamza' },
        lastName: { type: 'string', example: 'Updated' },
        phoneNumber: { type: 'string', example: '+923009876543' },
        dateOfBirth: { type: 'string', example: '1998-05-15' },
        profileImage: { type: 'string', format: 'binary', description: 'New profile image (replaces old one)' },
      },
    },
  })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Req() req: FastifyRequest,
  ): Promise<UserProfileDto> {
    const contentType = req.headers['content-type'] || '';
    let updates: Partial<UpdateProfileDto> = {};
    let fileBuffer: Buffer | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const parsed = await this.parseMultipart(req);
      updates = {};
      if (parsed.fields.firstName) updates.firstName = parsed.fields.firstName;
      if (parsed.fields.lastName) updates.lastName = parsed.fields.lastName;
      if (parsed.fields.phoneNumber) updates.phoneNumber = parsed.fields.phoneNumber;
      if (parsed.fields.dateOfBirth) updates.dateOfBirth = parsed.fields.dateOfBirth;
      fileBuffer = parsed.fileBuffer;
      fileName = parsed.fileName;
      mimeType = parsed.mimeType;
    } else {
      const body = req.body as Record<string, any>;
      if (body.firstName !== undefined) updates.firstName = body.firstName;
      if (body.lastName !== undefined) updates.lastName = body.lastName;
      if (body.phoneNumber !== undefined) updates.phoneNumber = body.phoneNumber;
      if (body.dateOfBirth !== undefined) updates.dateOfBirth = body.dateOfBirth;
    }

    let newImageId: Types.ObjectId | undefined;
    if (fileBuffer) {
      const oldImageId = await this.usersService.getOldProfileImageId(userId);

      const fileDoc = await this.filesService.uploadFileAndReturnDoc(
        userId,
        fileBuffer,
        fileName!,
        mimeType!,
        FileCategory.PROFILES,
      );
      newImageId = fileDoc._id as Types.ObjectId;

      if (oldImageId) {
        await this.filesService.hardDeleteByIdIfExists(oldImageId);
      }
    }

    const user = await this.usersService.updateProfile(userId, updates, newImageId);
    return this.mapUserToProfile(user);
  }

  @ApiBearerAuth('Bearer')
  @Delete('users/me/profile-image')
  @ApiOperation({ summary: 'Remove profile image' })
  async deleteProfileImage(
    @CurrentUser('userId') userId: string,
  ): Promise<UserProfileDto> {
    const oldImageId = await this.usersService.getOldProfileImageId(userId);
    if (oldImageId) {
      await this.filesService.hardDeleteByIdIfExists(oldImageId);
    }
    const user = await this.usersService.removeProfileImage(userId);
    return this.mapUserToProfile(user);
  }

  // ──────────────────────────────────────────────
  // Settings
  // ──────────────────────────────────────────────

  @ApiBearerAuth('Bearer')
  @Post('settings/change-password')
  @ApiOperation({ summary: 'Change password (requires current password)' })
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }
    await this.usersService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @ApiBearerAuth('Bearer')
  @Get('settings/notifications')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getNotificationSettings(
    @CurrentUser('userId') userId: string,
  ): Promise<NotificationSettingsDto> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return { enabled: user.notificationsEnabled ?? true };
  }

  @ApiBearerAuth('Bearer')
  @Patch('settings/notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotificationSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateNotificationDto,
  ): Promise<NotificationSettingsDto> {
    const user = await this.usersService.updateNotificationPreference(
      userId,
      dto.enabled,
    );
    return { enabled: user.notificationsEnabled ?? true };
  }

  @ApiBearerAuth('Bearer')
  @Delete('users/me/account')
  @ApiOperation({
    summary: 'Delete account (soft-delete, deactivates the account)',
  })
  async deleteAccount(
    @CurrentUser('userId') userId: string,
  ): Promise<MessageResponseDto> {
    await this.usersService.softDeleteAccount(userId);
    await this.authService.logout(userId);
    return { message: 'Account deleted successfully' };
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  private async parseMultipart(req: FastifyRequest): Promise<{
    fields: Record<string, string>;
    fileBuffer: Buffer | null;
    fileName: string | null;
    mimeType: string | null;
  }> {
    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileName: string | null = null;
    let mimeType: string | null = null;

    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'profileImage') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk as Buffer);
          }
          fileBuffer = Buffer.concat(chunks);

          if (part.file.truncated) {
            throw new BadRequestException({
              message: 'File exceeds the maximum allowed size of 5MB',
              code: 'FILE_TOO_LARGE',
            });
          }

          fileName = part.filename;
          mimeType = part.mimetype;
        }
      } else {
        fields[part.fieldname] = (part as any).value as string;
      }
    }

    return { fields, fileBuffer, fileName, mimeType };
  }

  private mapUserToProfile(user: any): UserProfileDto {
    let profileImage = null;
    if (user.profileImage && typeof user.profileImage === 'object' && user.profileImage._id) {
      profileImage = {
        id: user.profileImage._id.toString(),
        fileName: user.profileImage.fileName,
        fileType: user.profileImage.fileType,
        url: user.profileImage.url || user.profileImage.s3Url || '',
      };
    }

    return {
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isProfileComplete: user.isProfileComplete,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth?.toISOString?.() ?? user.dateOfBirth,
      profileImage,
      subscriptionTier: user.subscriptionTier || 'free',
      socialProvider: user.socialProvider,
      socialPhotoUrl: user.socialPhotoUrl,
    };
  }
}
