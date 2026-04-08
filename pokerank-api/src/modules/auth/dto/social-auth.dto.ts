import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { UserProfileDto } from './auth-response.dto.js';

export enum SocialProviderEnum {
  GOOGLE = 'google',
  APPLE = 'apple',
  GITHUB = 'github',
}

export class SocialAuthDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIs...',
    description: 'Firebase ID token obtained from client-side Firebase Auth',
  })
  @IsString()
  idToken!: string;

  @ApiProperty({
    enum: SocialProviderEnum,
    example: 'google',
    description: 'Social provider used for authentication',
  })
  @IsEnum(SocialProviderEnum, {
    message: 'provider must be one of: google, apple, github',
  })
  provider!: SocialProviderEnum;
}

export class SocialAuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;

  @ApiProperty({
    example: false,
    description: 'true if this is a brand new user (first time sign-in)',
  })
  isNewUser!: boolean;
}
