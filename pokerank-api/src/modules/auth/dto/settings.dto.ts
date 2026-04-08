import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass@123' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({
    example: 'NewPass@456',
    description: 'Min 8 chars, 1 uppercase, 1 number, 1 special char',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
  })
  newPassword!: string;

  @ApiProperty({ example: 'NewPass@456' })
  @IsString()
  confirmPassword!: string;
}

export class UpdateNotificationDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}

export class NotificationSettingsDto {
  @ApiProperty()
  enabled!: boolean;
}
