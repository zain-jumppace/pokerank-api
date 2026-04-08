import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NameGeneratorService } from './name-generator.service.js';
import {
  GenerateNameDto,
  GenerateNameResponseDto,
} from './dto/generate-name.dto.js';
import { PresetDto, SavePresetDto } from './dto/save-preset.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Name Generator')
@Controller('name-generator')
export class NameGeneratorController {
  constructor(private readonly nameGeneratorService: NameGeneratorService) {}

  @Post('generate')
  @Public()
  @ApiOperation({ summary: 'Generate a name from template' })
  async generate(
    @Body() dto: GenerateNameDto,
  ): Promise<GenerateNameResponseDto> {
    return this.nameGeneratorService.generate(dto);
  }

  @Get('presets')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user saved presets' })
  async getPresets(
    @CurrentUser('userId') userId: string,
  ): Promise<PresetDto[]> {
    return this.nameGeneratorService.getPresets(userId);
  }

  @Post('presets')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a preset' })
  async savePreset(
    @CurrentUser('userId') userId: string,
    @Body() dto: SavePresetDto,
  ): Promise<PresetDto> {
    return this.nameGeneratorService.savePreset(userId, dto);
  }

  @Delete('presets/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a preset' })
  async deletePreset(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.nameGeneratorService.deletePreset(userId, id);
    return { message: 'Preset deleted successfully' };
  }
}
