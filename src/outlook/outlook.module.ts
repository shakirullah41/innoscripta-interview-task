import { Module } from '@nestjs/common';
import { OutlookService } from './outlook.service';
import { OauthStrategy } from './outlook-oauth.strategy';
import { DatabaseOperationModule } from '../database-operation/database-operation.module';
import { UserModule } from '../user/user.module';
import { OutlookController } from './outlook.controller';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailSyncProcessor } from './queues/email-sync.queue';
import { WebhookProcessor } from './queues/webhook.queue';

@Module({
  imports: [
    UserModule,
    DatabaseOperationModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'email-sync',
    }),
    BullModule.registerQueue({
      name: 'webhook-notifications',
    }),
  ],
  providers: [
    OutlookService,
    OauthStrategy,
    EmailSyncProcessor,
    WebhookProcessor,
  ],
  exports: [OutlookService],
  controllers: [OutlookController],
})
export class OutlookModule {}
