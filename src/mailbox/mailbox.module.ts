import { Module } from '@nestjs/common';
import { MailboxService } from './mailbox.service';
import { MailboxController } from './mailbox.controller';
import { DatabaseOperationModule } from '../database-operation/database-operation.module';

@Module({
  imports:[DatabaseOperationModule],
  providers: [MailboxService],
  controllers: [MailboxController]
})
export class MailboxModule {}
