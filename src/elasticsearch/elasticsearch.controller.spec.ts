import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchController } from './elasticsearch.controller';
import { ElasticsearchService } from './elasticsearch.service';

describe('ElasticsearchController', () => {
  let controller: ElasticsearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ElasticsearchController],
      providers: [ElasticsearchService],
    }).compile();

    controller = module.get<ElasticsearchController>(ElasticsearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
