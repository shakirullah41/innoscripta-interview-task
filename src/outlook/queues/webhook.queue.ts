import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { OutlookService } from '../outlook.service';

@Processor('webhook-notifications')
@Injectable()
export class WebhookProcessor {
  constructor(private readonly outlookService: OutlookService) {}

  @Process()
  async handleWebhookNotification(job: Job) {
    const { userId, notification } = job.data;
    await this.outlookService.handleNotification(userId, notification);
  }
}
