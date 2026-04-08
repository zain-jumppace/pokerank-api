import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { EmailService } from './email.service.js';
import { UsersService } from '../users/users.service.js';
import { RefreshToken } from './schemas/refresh-token.schema.js';
import { OtpCode } from './schemas/otp-code.schema.js';

jest.mock('bcrypt');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-token' }));

const mockUser = {
  _id: { toString: () => '507f1f77bcf86cd799439011' },
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  role: 'user',
  isEmailVerified: true,
  isProfileComplete: false,
};

const mockRefreshTokenModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
};

const mockOtpCodeModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let emailService: jest.Mocked<Partial<EmailService>>;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      markEmailVerified: jest.fn(),
      updatePassword: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };

    emailService = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: emailService },
        { provide: getModelToken(RefreshToken.name), useValue: mockRefreshTokenModel },
        { provide: getModelToken(OtpCode.name), useValue: mockOtpCodeModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockRefreshTokenModel.create.mockResolvedValue({});
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@example.com', 'password');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-uuid-token');
      expect(result.isEmailVerified).toBe(true);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      usersService.findByEmail!.mockResolvedValue(null);
      await expect(service.login('bad@email.com', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByEmail!.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login('test@example.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      mockRefreshTokenModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens for user', async () => {
      mockRefreshTokenModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      await service.logout('507f1f77bcf86cd799439011');
      expect(mockRefreshTokenModel.updateMany).toHaveBeenCalled();
    });
  });
});
