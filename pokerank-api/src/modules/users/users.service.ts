import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { SocialProvider, User, UserDocument } from './schemas/user.schema.js';
import { ERROR_CODES } from '../../common/constants/error-codes.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).populate('profileImage').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).populate('profileImage').exec();
  }

  async create(
    email: string,
    password: string,
    role = 'user',
  ): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing && existing.isEmailVerified) {
      throw new ConflictException({
        message: 'Email already exists',
        code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    return this.userModel.create({
      email,
      passwordHash,
      role,
      isEmailVerified: false,
      isProfileComplete: false,
    });
  }

  async markEmailVerified(userId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { isEmailVerified: true }, { new: true })
      .populate('profileImage')
      .exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }
    return user;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const result = await this.userModel
      .findByIdAndUpdate(userId, { passwordHash })
      .exec();
    if (!result) {
      throw new NotFoundException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }
  }

  async createProfile(
    userId: string,
    profile: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      dateOfBirth?: string;
    },
    profileImageId?: Types.ObjectId,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }

    if (user.isProfileComplete) {
      throw new BadRequestException({
        message: 'Profile is already complete. Use PATCH /users/me to update.',
        code: ERROR_CODES.PROFILE_ALREADY_COMPLETE,
      });
    }

    const updateData: Record<string, unknown> = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      isProfileComplete: true,
    };

    if (profile.phoneNumber) updateData.phoneNumber = profile.phoneNumber;
    if (profile.dateOfBirth) updateData.dateOfBirth = new Date(profile.dateOfBirth);
    if (profileImageId) updateData.profileImage = profileImageId;

    const updated = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .populate('profileImage')
      .exec();

    return updated!;
  }

  async updateProfile(
    userId: string,
    updates: Partial<{
      firstName: string;
      lastName: string;
      phoneNumber: string;
      dateOfBirth: string;
    }>,
    profileImageId?: Types.ObjectId,
  ): Promise<UserDocument> {
    const updateData: Record<string, unknown> = {};
    if (updates.firstName !== undefined) updateData.firstName = updates.firstName;
    if (updates.lastName !== undefined) updateData.lastName = updates.lastName;
    if (updates.phoneNumber !== undefined) updateData.phoneNumber = updates.phoneNumber;
    if (updates.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(updates.dateOfBirth);
    if (profileImageId) updateData.profileImage = profileImageId;

    const user = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .populate('profileImage')
      .exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }
    return user;
  }

  async getOldProfileImageId(userId: string): Promise<Types.ObjectId | null> {
    const user = await this.userModel.findById(userId).select('profileImage').exec();
    return user?.profileImage ?? null;
  }

  async removeProfileImage(userId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $unset: { profileImage: 1 } }, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }
    return user;
  }

  async updateNotificationPreference(
    userId: string,
    enabled: boolean,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { notificationsEnabled: enabled }, { new: true })
      .populate('profileImage')
      .exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }
    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }

    if (!user.passwordHash) {
      throw new BadRequestException({
        message: 'This account uses social sign-in and does not have a password to change.',
        code: ERROR_CODES.PASSWORD_CHANGE_NO_PASSWORD,
      });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException({
        message: 'Current password is incorrect',
        code: ERROR_CODES.INVALID_CREDENTIALS,
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userModel.findByIdAndUpdate(userId, { passwordHash }).exec();
  }

  async softDeleteAccount(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        code: ERROR_CODES.USER_NOT_FOUND,
      });
    }
    if (user.deletedAt) {
      throw new BadRequestException({
        message: 'Account is already scheduled for deletion',
        code: ERROR_CODES.ACCOUNT_ALREADY_DELETED,
      });
    }
    await this.userModel.findByIdAndUpdate(userId, {
      deletedAt: new Date(),
      email: `deleted_${userId}_${user.email}`,
    }).exec();
  }

  async findOrCreateSocialUser(params: {
    email: string;
    provider: SocialProvider;
    providerId: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
  }): Promise<{ user: UserDocument; isNewUser: boolean }> {
    const existing = await this.userModel
      .findOne({ email: params.email })
      .populate('profileImage')
      .exec();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (!existing.socialProvider) {
        updates.socialProvider = params.provider;
        updates.socialProviderId = params.providerId;
      }
      if (!existing.isEmailVerified) {
        updates.isEmailVerified = true;
      }
      if (params.photoUrl && !existing.socialPhotoUrl) {
        updates.socialPhotoUrl = params.photoUrl;
      }
      if (params.firstName && !existing.firstName) {
        updates.firstName = params.firstName;
      }
      if (params.lastName && !existing.lastName) {
        updates.lastName = params.lastName;
      }

      if (Object.keys(updates).length > 0) {
        const updated = await this.userModel
          .findByIdAndUpdate(existing._id, updates, { new: true })
          .populate('profileImage')
          .exec();
        return { user: updated!, isNewUser: false };
      }
      return { user: existing, isNewUser: false };
    }

    const isProfileComplete = !!(params.firstName && params.lastName);
    const newUser = await this.userModel.create({
      email: params.email,
      role: 'user',
      isEmailVerified: true,
      isProfileComplete: isProfileComplete,
      firstName: params.firstName,
      lastName: params.lastName,
      socialProvider: params.provider,
      socialProviderId: params.providerId,
      socialPhotoUrl: params.photoUrl,
    });

    return { user: newUser, isNewUser: true };
  }

  async seedAdmin(email: string, password: string): Promise<void> {
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) return;
    const passwordHash = await bcrypt.hash(password, 12);
    await this.userModel.create({
      email,
      passwordHash,
      role: 'admin',
      isEmailVerified: true,
      isProfileComplete: true,
      firstName: 'Admin',
      lastName: 'User',
    });
  }
}
