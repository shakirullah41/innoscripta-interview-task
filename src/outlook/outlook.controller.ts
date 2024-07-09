import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Public } from '../auth/decorator/public.decorator';
import { OutlookService } from './outlook.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('outlook')
@Controller('outlook')
export class OutlookController {
  constructor(private outlookService: OutlookService) {}
  @Public()
  @Post('webhook/:userId')
  @HttpCode(200)
  async handleWebhook(
    @Body() notification: any,
    @Res() res,
    @Query('validationToken') validationToken: string,
    @Param('userId') userId: string,
  ) {
    // Handle the webhook notification
    if (validationToken) {
      res.set('Content-Type', 'text/plain');
      res.status(200).send(validationToken);
    }
    // await this.outlookService.handleNotification(notification, userId);
    await this.outlookService.addWebhookJob(userId, notification);
    return res.status(200).send();
  }
}
