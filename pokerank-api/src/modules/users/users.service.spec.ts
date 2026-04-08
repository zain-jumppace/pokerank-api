import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import { User } from './schemas/user.schema.js';

jest.mock('bcrypt');

const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const user = { email: 'test@example.com', role: 'user' };
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const result = await service.findByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const user = { _id: '123', email: 'test@example.com' };
      mockUserModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
      const result = await service.findById('123');
      expect(result).toEqual(user);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      mockUserModel.create.mockResolvedValue({
        email: 'new@example.com',
        role: 'user',
        isEmailVerified: false,
        isProfileComplete: false,
      });

      const result = await service.create('new@example.com', 'password');
      expect(result.email).toBe('new@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
    });

    it('should throw ConflictException if verified email exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ email: 'exists@example.com', isEmailVerified: true }),
      });
      await expect(service.create('exists@example.com', 'password')).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updated = { email: 'test@example.com', firstName: 'Updated' };
      mockUserModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });
      const result = await service.updateProfile('123', { firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.updateProfile('bad-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('seedAdmin', () => {
    it('should skip if admin already exists', async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ email: 'admin@test.com' }) });
      await service.seedAdmin('admin@test.com', 'password');
      expect(mockUserModel.create).not.toHaveBeenCalled();
    });
  });
});
