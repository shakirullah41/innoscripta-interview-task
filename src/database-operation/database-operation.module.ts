import { Module } from '@nestjs/common';
import { DatabaseOperationService } from './database-operation.service';
import { ElasticsearchModule } from '@nestjs/elasticsearch';

@Module({
  imports: [
    ElasticsearchModule.register({
      node: 'http://localhost:9200',
    }),
  ],
  providers: [DatabaseOperationService],
  exports: [DatabaseOperationService],
})
export class DatabaseOperationModule {}
