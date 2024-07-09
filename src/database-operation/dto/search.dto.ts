import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class SearchDto {
  @IsOptional()
  @IsString()
  index?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string = 'desc'; // 'asc' or 'desc'

  @IsOptional()
  @IsNotEmpty()
  page?: number = 1;

  @IsOptional()
  @IsNotEmpty()
  pageSize?: number = 10;
}
