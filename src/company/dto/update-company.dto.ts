import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
