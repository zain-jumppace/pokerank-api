import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service.js';
import { RecommendationInputDto } from './dto/recommendation-input.dto.js';
import { RecommendationResultDto } from './dto/recommendation-result.dto.js';

@ApiTags('Recommendations')
@ApiBearerAuth()
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Generate recommendations' })
  async generate(
    @Body() dto: RecommendationInputDto,
  ): Promise<RecommendationResultDto[]> {
    return this.recommendationsService.generateRecommendations(dto);
  }
}
