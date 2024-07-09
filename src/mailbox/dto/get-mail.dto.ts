import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ImportanceEnum } from '../enum/Importance.enum';
import { ProviderEnum } from '../enum/provider.enum';

export class GetMailDto {
  @ApiPropertyOptional({
    description: 'ID of the folder to filter emails by',
    type: Number,
  })
  @IsOptional()
  @IsNotEmpty()
  @Type(() => Number)
  folderId?: number;

  @ApiPropertyOptional({
    description: 'Subject to filter emails by',
    type: String,
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Sender email address to filter emails by',
    type: String,
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({
    description: 'Start date for filtering emails',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for filtering emails',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Importance of the emails to filter by',
    enum: ImportanceEnum,
  })
  @IsOptional()
  @IsEnum(ImportanceEnum)
  importance?: ImportanceEnum;

  @ApiPropertyOptional({
    description: 'Email provider to filter emails by',
    enum: ProviderEnum,
  })
  @IsOptional()
  @IsEnum(ProviderEnum)
  provider?: ProviderEnum;

  @ApiPropertyOptional({
    description: 'Field to sort the emails by',
    type: String,
    default: 'receivedDateTime',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'receivedDateTime';

  @ApiPropertyOptional({
    description: 'Order to sort the emails in',
    type: String,
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: string = 'desc'; // 'asc' or 'desc'

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    type: Number,
    default: 1,
  })
  @IsOptional()
  @IsNotEmpty()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page for pagination',
    type: Number,
    default: 10,
  })
  @IsOptional()
  @IsNotEmpty()
  @Type(() => Number)
  pageSize?: number = 10;
}
