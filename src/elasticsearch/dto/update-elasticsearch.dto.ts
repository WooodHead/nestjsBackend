import { PartialType } from '@nestjs/mapped-types';
import { CreateElasticsearchDto } from './create-elasticsearch.dto';

export class UpdateElasticsearchDto extends PartialType(CreateElasticsearchDto) {}
