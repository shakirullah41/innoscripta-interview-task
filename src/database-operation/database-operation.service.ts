import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { User } from '../user/user.entity';
import { SearchDto } from './dto/search.dto';

@Injectable()
export class DatabaseOperationService {
  constructor(private elasticsearchService: ElasticsearchService) {}
  async createIndex(index: string): Promise<any> {
    try {
      const indexExists = await this.elasticsearchService.indices.exists({
        index,
      });
      console.log(indexExists);
      if (!indexExists) {
        const response = await this.elasticsearchService.indices.create({
          index,
        });
        return response;
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }
  async upsert(index: string, id: string, body: any): Promise<any> {
    try {
      await this.createIndex(index); // Ensure index exists
      const response = await this.elasticsearchService.index({
        index,
        id,
        body,
        refresh: true,
      });
      return response;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }

  async insert(index: string, body: any): Promise<any> {
    try {
      await this.createIndex(index); // Ensure index exists
      const response = await this.elasticsearchService.index({
        index,
        id: body.id,
        body,
        refresh: true,
      });
      return response;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }

  async update(index: string, id: string, body: any): Promise<any> {
    try {
      await this.createIndex(index); // Ensure index exists
      const response = await this.elasticsearchService.update({
        index,
        id,
        body: {
          doc: body,
        },
        refresh: true,
      });
      return response;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }

  // async bulkInsert(index: string, data: any[], userId: string): Promise<any> {
  //   try {
  //     if (data.length) {
  //       await this.createIndex(index); // Ensure index exists
  //       const bulkOps = data.flatMap((doc) => [
  //         { index: { _index: index } },
  //         { ...doc, userId },
  //       ]);
  //       const response = await this.elasticsearchService.bulk({
  //         refresh: true,
  //         body: bulkOps,
  //       });
  //       if (response.errors) {
  //         throw new InternalServerErrorException('Bulk insert had errors');
  //       }
  //       return response;
  //     }
  //     return null;
  //   } catch (error) {
  //     throw new InternalServerErrorException(error);
  //   }
  // }
  async bulkInsert(index: string, data: any[], userId: string): Promise<any> {
    try {
      if (data.length) {
        await this.createIndex(index); // Ensure index exists
        const bulkOps = data.flatMap((doc) => [
          { update: { _index: index, _id: doc.id } },
          { doc: { ...doc, userId }, doc_as_upsert: true },
        ]);

        const response = await this.elasticsearchService.bulk({
          refresh: true,
          body: bulkOps,
        });

        if (response.errors) {
          throw new InternalServerErrorException('Bulk insert had errors');
        }

        return response;
      }
      return null;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }

  async search(index: string, query: any): Promise<any> {
    try {
      await this.createIndex(index); // Ensure index exists
      const response = await this.elasticsearchService.search({
        index,
        body: {
          query,
        },
      });
      const hits = response.hits.hits;
      return hits.map((hit) => hit._source);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }
  async searchAndPaginate(
    userId: string,
    searchDto: SearchDto,
    filters,
  ): Promise<any> {
    try {
      const { must, filter, must_not, should } = filters;
      const { index, page, pageSize, sortOrder, sortBy } = searchDto;
      const fromIndex = (page - 1) * pageSize;

      const query = {
        bool: {
          must: [{ match: { userId } }, ...must],
          filter,
          must_not,
          should,
        },
      };
      const sort: any = [{ [sortBy]: { order: sortOrder } }];
      const searchResponse = await this.elasticsearchService.search({
        index,
        body: {
          query,
          from: fromIndex,
          size: pageSize,
          sort,
        },
      });

      const hits = searchResponse.hits.hits;
      const results = hits.map((hit) => hit._source);

      const countResponse = await this.elasticsearchService.count({
        index,
        body: {
          query,
        },
      });

      const count = countResponse.count;

      return {
        results,
        count,
        page,
        pageSize,
      };
    } catch (e) {
      if (
        e.meta &&
        e.meta.body &&
        e.meta.body.error &&
        e.meta.body.error.type === 'index_not_found_exception'
      ) {
        throw new NotFoundException(`No data found`);
      }
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }
  async delete(index, id): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index,
        id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }

  async findById(index: string, id: string): Promise<User | null> {
    try {
      const result = await this.elasticsearchService.get<User>({
        index,
        id,
      });

      if (result) {
        return result._source;
      }
      return null;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }
}
