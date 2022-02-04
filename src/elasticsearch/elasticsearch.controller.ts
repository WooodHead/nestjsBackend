import { ElasticSearchLead } from './types/elasticSearchRecord';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { CreateElasticsearchDto } from './dto/create-elasticsearch.dto';

@Controller('elasticsearch')
export class ElasticsearchController {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  @Delete('remove/:id')
  async removeReocrd(@Param('id') lead_id: string) {
    return await this.elasticsearchService.removeRecord(lead_id);
  }

  @Post('create/:id')
  async create(@Param('id') lead_id: string, @Body() elasticSearchRecord: ElasticSearchLead) {
    return await this.elasticsearchService.create(lead_id, elasticSearchRecord);
  }

  @Post('search')
  async search( @Body() searchPayload: CreateElasticsearchDto) {
    return await this.elasticsearchService.searchData(searchPayload);
  }

}
