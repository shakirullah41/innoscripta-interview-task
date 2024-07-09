import { Injectable } from '@nestjs/common';
import { DatabaseOperationService } from '../database-operation/database-operation.service';
import { GetMailDto } from './dto/get-mail.dto';
import { SearchDto } from '../database-operation/dto/search.dto';

@Injectable()
export class MailboxService {
  constructor(private databaseOperationService: DatabaseOperationService) {}

  getMails(userId, getMailDto: GetMailDto) {
    const {
      folderId,
      subject,
      from,
      startDate,
      endDate,
      importance,
      provider,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = getMailDto;
    const filters: any = {
      must: [{ match: { userId } }],
      filter: [],
      must_not: [],
      should: [],
    };

    if (subject) {
      filters.must.push({ match: { subject } });
    }

    if (from) {
      filters.must.push({ term: { 'from.emailAddress.address': from } });
    }

    if (startDate && endDate) {
      filters.filter.push({
        range: { receivedDateTime: { gte: startDate, lte: endDate } },
      });
    }

    if (importance) {
      filters.filter.push({ term: { importance } });
    }
    if (folderId) {
      filters.filter.push({ term: { folderId } });
    }
    const index = `${provider}_messages_${userId}_s`;
    const searchDto: SearchDto = {
      page,
      pageSize,
      sortBy,
      sortOrder,
      index,
    };
    return this.databaseOperationService.searchAndPaginate(
      userId,
      searchDto,
      filters,
    );
  }
  getMailBoxFolders(userId, provider) {
    return this.databaseOperationService.search(
      `${provider}_mailfolders_${userId}`,
      {
        match: { userId },
      },
    );
  }
}
