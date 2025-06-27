import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  skills: string;

  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  url?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;
}
