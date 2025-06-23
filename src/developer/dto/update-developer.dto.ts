import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDeveloperDto {
  @ApiProperty({
    description: 'Developer name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Developer link/URL',
    example: 'https://github.com/johndoe',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  link?: string;
}
