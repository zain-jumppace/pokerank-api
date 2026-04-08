import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service.js';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema.js';
import {
  OtpCode,
  OtpCodeDocument,
  OtpPurpose,
} from './schemas/otp-code.schema.js';
import { EmailService } from './email.service.js';
import { FirebaseAdminService } from './firebase-admin.service.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { SocialProvider } from '../users/schemas/user.schema.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly firebaseAdminService: FirebaseAdminService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(OtpCode.name)
    private readonly otpCodeModel: Model<OtpCodeDocument>,
  ) {}

  // ────────────────────────────────────────────────────────
  // Registration Flow: register → verify OTP → create profile
  // ────────────────────────────────────────────────────────

  async register(
    email: string,
    password: string,
  ): Promise<{ message: string; email: string }> {
    const existing = await this.usersService.findByEmail(email);
    if (existing && existing.isEmailVerified) {
      throw new BadRequestException({
        message: 'Email already exists',
        code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
      });
    }

    if (existing && !existing.isEmailVerified) {
      await this.usersService.updatePassword(
        (existing._id as Types.ObjectId).toString(),
        password,
      );
    } else {
      await this.usersService.create(email, password);
    }

    await this.generateAndSendOtp(email, OtpPurpose.EMAIL_VERIFICATION);

    return {
      message: 'OTP sent to your email',
      email,
    };
  }

  async verifyRegistrationOtp(
    email: string,
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserDocument }> {
    await this.verifyOtp(email, code, OtpPurpose.EMAIL_VERIFICATION);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }

    const verified = await this.usersService.markEmailVerified(
      (user._id as Types.ObjectId).toString(),
    );

    const tokens = await this.generateTokens(
      user._id as Types.ObjectId,
      user.email,
      user.role,
    );

    return { ...tokens, user: verified };
  }

  async resendOtp(email: string, purpose: OtpPurpose): Promise<{ message: string }> {
    if (purpose === OtpPurpose.EMAIL_VERIFICATION) {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new BadRequestException({
          message: 'User not found',
          code: ERROR_CODES.USER_NOT_FOUND,
        });
      }
      if (user.isEmailVerified) {
        throw new BadRequestException({
          message: 'Email is already verified',
          code: ERROR_CODES.EMAIL_NOT_VERIFIED,
        });
      }
    }

    const recent = await this.otpCodeModel
      .findOne({ email, purpose, isUsed: false })
      .sort({ createdAt: -1 })
      .exec();

    if (recent) {
      const createdAt = (recent as any).createdAt as Date;
      const secondsSince = (Date.now() - createdAt.getTime()) / 1000;
      if (secondsSince < OTP_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(OTP_COOLDOWN_SECONDS - secondsSince);
        throw new BadRequestException({
          message: `Please wait ${waitSeconds} seconds before requesting a new code`,
          code: ERROR_CODES.OTP_COOLDOWN,
        });
      }
    }

    await this.generateAndSendOtp(email, purpose);
    return { message: 'OTP sent to your email' };
  }

  // ────────────────────────────────────────────────────────
  // Login
  // ────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserDocument }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        code: ERROR_CODES.INVALID_CREDENTIALS,
      });
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException({
        message: `This account uses ${user.socialProvider ?? 'social'} sign-in. Please login with your social account.`,
        code: ERROR_CODES.INVALID_CREDENTIALS,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        code: ERROR_CODES.INVALID_CREDENTIALS,
      });
    }

    if (!user.isEmailVerified) {
      await this.generateAndSendOtp(user.email, OtpPurpose.EMAIL_VERIFICATION);
      throw new UnauthorizedException({
        message: 'Email not verified. A new OTP has been sent to your email.',
        code: ERROR_CODES.EMAIL_NOT_VERIFIED,
      });
    }

    const tokens = await this.generateTokens(
      user._id as Types.ObjectId,
      user.email,
      user.role,
    );

    return { ...tokens, user };
  }

  // ────────────────────────────────────────────────────────
  // Social Auth (Firebase)
  // ────────────────────────────────────────────────────────

  async socialLogin(
    idToken: string,
    provider: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserDocument;
    isNewUser: boolean;
  }> {
    let firebaseUser;
    try {
      firebaseUser = await this.firebaseAdminService.verifyIdToken(idToken);
    } catch (error) {
      this.logger.error('Firebase token verification failed', (error as Error).message);
      throw new UnauthorizedException({
        message: 'Invalid or expired social auth token',
        code: ERROR_CODES.SOCIAL_TOKEN_INVALID,
      });
    }

    if (!firebaseUser.email) {
      throw new BadRequestException({
        message: 'Social account does not have an email address. Please use an account with a valid email.',
        code: ERROR_CODES.SOCIAL_EMAIL_MISSING,
      });
    }

    const socialProvider = provider as SocialProvider;

    let firstName: string | undefined;
    let lastName: string | undefined;
    if (firebaseUser.displayName) {
      const parts = firebaseUser.displayName.split(' ');
      firstName = parts[0];
      lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    }

    const { user, isNewUser } = await this.usersService.findOrCreateSocialUser({
      email: firebaseUser.email,
      provider: socialProvider,
      providerId: firebaseUser.uid,
      firstName,
      lastName,
      photoUrl: firebaseUser.photoURL,
    });

    const tokens = await this.generateTokens(
      user._id as Types.ObjectId,
      user.email,
      user.role,
    );

    this.logger.log(
      `Social auth (${provider}): ${firebaseUser.email} — ${isNewUser ? 'NEW' : 'EXISTING'} user`,
    );

    return { ...tokens, user, isNewUser };
  }

  // ────────────────────────────────────────────────────────
  // Forgot Password Flow: forgot → verify OTP → reset
  // ────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If an account exists, an OTP has been sent' };
    }

    await this.generateAndSendOtp(email, OtpPurpose.PASSWORD_RESET);
    return { message: 'If an account exists, an OTP has been sent' };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.verifyOtp(email, code, OtpPurpose.PASSWORD_RESET);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }

    await this.usersService.updatePassword(
      (user._id as Types.ObjectId).toString(),
      newPassword,
    );

    await this.refreshTokenModel.updateMany(
      { userId: user._id, revokedAt: null },
      { revokedAt: new Date() },
    );

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  // ────────────────────────────────────────────────────────
  // Refresh / Logout
  // ────────────────────────────────────────────────────────

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserDocument }> {
    const stored = await this.refreshTokenModel
      .findOne({
        tokenHash: refreshToken,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!stored) {
      throw new UnauthorizedException({
        message: 'Invalid or expired refresh token',
        code: ERROR_CODES.REFRESH_TOKEN_INVALID,
      });
    }

    await this.refreshTokenModel.updateOne(
      { _id: stored._id },
      { revokedAt: new Date() },
    );

    const user = await this.usersService.findById(stored.userId.toString());
    if (!user) {
      throw new UnauthorizedException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }

    const tokens = await this.generateTokens(
      user._id as Types.ObjectId,
      user.email,
      user.role,
    );

    return { ...tokens, user };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokens = await this.refreshTokenModel.find({
        userId: new Types.ObjectId(userId),
        revokedAt: null,
      });

      for (const token of tokens) {
        const isMatch = await bcrypt.compare(refreshToken, token.tokenHash);
        if (isMatch) {
          token.revokedAt = new Date();
          await token.save();
          return;
        }
      }

      this.logger.warn(
        `Logout: refresh token not found for user ${userId}, revoking all sessions`,
      );
    }

    await this.refreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  // ────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────

  private generateOtpCode(): string {
    return Math.floor(100_000 + Math.random() * 900_000).toString();
  }

  private async generateAndSendOtp(email: string, purpose: OtpPurpose): Promise<void> {
    await this.otpCodeModel.updateMany(
      { email, purpose, isUsed: false },
      { isUsed: true },
    );

    const code = this.generateOtpCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    await this.otpCodeModel.create({ email, code, purpose, expiresAt });

    const emailPurpose = purpose === OtpPurpose.EMAIL_VERIFICATION
      ? 'verification'
      : 'password_reset';

    await this.emailService.sendOtp(email, code, emailPurpose);
    this.logger.log(`OTP generated for ${email} (${purpose})`);
  }

  private async verifyOtp(email: string, code: string, purpose: OtpPurpose): Promise<void> {
    const otp = await this.otpCodeModel
      .findOne({
        email,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!otp) {
      throw new BadRequestException({
        message: 'OTP expired or not found. Please request a new one.',
        code: ERROR_CODES.OTP_EXPIRED,
      });
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await this.otpCodeModel.updateOne({ _id: otp._id }, { isUsed: true });
      throw new BadRequestException({
        message: 'Too many invalid attempts. Please request a new OTP.',
        code: ERROR_CODES.OTP_MAX_ATTEMPTS,
      });
    }

    if (otp.code !== code) {
      await this.otpCodeModel.updateOne(
        { _id: otp._id },
        { $inc: { attempts: 1 } },
      );
      throw new BadRequestException({
        message: 'Invalid OTP code',
        code: ERROR_CODES.OTP_INVALID,
      });
    }

    await this.otpCodeModel.updateOne({ _id: otp._id }, { isUsed: true });
  }

  private async generateTokens(
    userId: Types.ObjectId,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId.toString(), email, role };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenModel.create({
      userId,
      tokenHash: refreshToken,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
