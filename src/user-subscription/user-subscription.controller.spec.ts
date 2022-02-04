import { Test, TestingModule } from '@nestjs/testing';
import { UserSubscriptionController } from './user-subscription.controller';
import { UserSubscriptionService } from './user-subscription.service';

describe('UserSubscriptionController', () => {
  let controller: UserSubscriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSubscriptionController],
      providers: [UserSubscriptionService],
    }).compile();

    controller = module.get<UserSubscriptionController>(UserSubscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
