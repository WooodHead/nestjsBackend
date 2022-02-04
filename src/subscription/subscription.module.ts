import { FeatureModule } from './../feature/feature.module';
import { Subscription } from './entities/subscription.entity';
import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionFeature } from './entities/subscriptionFeature.entity';
import { Feature } from 'src/feature/entities/feature.entity';
import { ProfessionalSubscription } from 'src/subscription/entities/professionalSubscription.entity';
import { OpenSubscriptionController } from './opensubcription.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionFeature,
      Feature,
      ProfessionalSubscription,
    ]),
  ],
  controllers: [SubscriptionController, OpenSubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
