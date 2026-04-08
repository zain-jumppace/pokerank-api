import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ArrayMaxSize, ArrayMinSize } from 'class-validator';

export class CreateRaidQueueDto {
  @ApiProperty({
    type: [Number],
    description: 'Array of Pokémon IDs for the counter team',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  pokemonIds!: number[];
}

export class RaidQueueDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  raidBossId!: string;

  @ApiProperty({ type: [Number] })
  pokemonIds!: number[];

  @ApiProperty()
  createdAt!: string;
}
