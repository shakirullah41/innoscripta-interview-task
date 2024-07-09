import { Module } from '@nestjs/common';
import { DatabaseOperationService } from './database-operation.service';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_HOST'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DatabaseOperationService],
  exports: [DatabaseOperationService],
})
export class DatabaseOperationModule {}
