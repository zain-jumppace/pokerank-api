import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SavePresetDto {
  @ApiProperty({ example: 'PvP Standard' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: '{Species}{IV}{League}' })
  @IsString()
  @MaxLength(100)
  template!: string;
}

export class PresetDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  template!: string;
}
