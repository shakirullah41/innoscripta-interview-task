import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { OutlookService } from '../outlook.service';

@Processor('email-sync')
export class EmailSyncProcessor {
  constructor(private readonly outlookService: OutlookService) {}

  @Process()
  async handleEmailSync(job: Job) {
    const { userId, accessToken } = job.data;
    await this.outlookService.fetchAllEmails(userId, accessToken);
  }
}
