import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class UpdateJobDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  skills?: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  url?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;
}
