import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileImageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  fileType!: string;

  @ApiProperty()
  url!: string;
}

export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty()
  isProfileComplete!: boolean;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiPropertyOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ type: ProfileImageDto })
  profileImage?: ProfileImageDto | null;

  @ApiProperty()
  subscriptionTier!: string;

  @ApiPropertyOptional({ description: 'Social provider: google, apple, github' })
  socialProvider?: string;

  @ApiPropertyOptional({ description: 'Photo URL from social provider' })
  socialPhotoUrl?: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}

export class RegisterResponseDto {
  @ApiProperty({ example: 'OTP sent to your email' })
  message!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}
