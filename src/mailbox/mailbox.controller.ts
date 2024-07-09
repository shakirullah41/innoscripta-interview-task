import { Controller, Get, Param, Query } from '@nestjs/common';
import { MailboxService } from './mailbox.service';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '../user/user.entity';
import { GetMailDto } from './dto/get-mail.dto';
import { ProviderEnum } from './enum/provider.enum';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('mailbox')
@Controller('mailbox')
export class MailboxController {
  constructor(private mailboxService: MailboxService) {}

  @Get('/mails')
  getAll(@Query() getMailDto: GetMailDto, @GetUser() user: User) {
    console.log(getMailDto);
    return this.mailboxService.getMails(user.id, getMailDto);
  }
  @Get('/:provider')
  getMailBoxFolders(
    @GetUser() user: User,
    @Param('provider') provider: ProviderEnum,
  ) {
    return this.mailboxService.getMailBoxFolders(user.id, provider);
  }
}
