import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './../user/user.module';
import { forwardRef, Module } from '@nestjs/common';
import { UserSubscriptionService } from './user-subscription.service';
import { UserSubscriptionController } from './user-subscription.controller';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { UserSubscription } from './entities/user-subscription.entity';
import { Inject } from '@nestjs/common';
// import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSubscription]),
    SubscriptionModule,
    forwardRef(() => UserModule),
    // forwardRef(() => WebsocketModule),
  ],
  controllers: [UserSubscriptionController],
  providers: [UserSubscriptionService],
  exports: [TypeOrmModule, UserSubscriptionService],
})
export class UserSubscriptionModule {}
