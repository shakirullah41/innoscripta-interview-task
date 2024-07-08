import { Module } from '@nestjs/common';
import { OutlookService } from './outlook.service';
import { OauthStrategy } from './outlook-oauth.strategy';
import { EmailModule } from '../email/email.module';
import { DatabaseOperationModule } from '../database-operation/database-operation.module';
import { UserModule } from '../user/user.module';
import { OutlookController } from './outlook.controller';

@Module({
  imports: [EmailModule, UserModule, DatabaseOperationModule],
  providers: [OutlookService, OauthStrategy],
  exports: [OutlookService],
  controllers: [OutlookController],
})
export class OutlookModule {}
