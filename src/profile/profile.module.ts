import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { Document } from './entities/document.entity';
import { UserModule } from 'src/user/user.module';
import { ReviewModule } from 'src/review/review.module';
import { Review } from 'src/review/entity/review.entity';
import { PaymentService } from './providerPayment.service';
import { PaymentController } from './providerPayment.controller';
import { ProviderPaymentDetails } from './entities/providerPaymentDetails.entity';
import { BankModule } from 'src/bank/bank.module';
import { UserSkill } from './entities/user-skill.entity';
import { SkillModule } from 'src/skill/skill.module';
import { OrganizationModule } from 'src/organization/organization.module';
import { UserSubscriptionModule } from 'src/user-subscription/user-subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Profile,
      Document,
      ProviderPaymentDetails,
      UserSkill,
    ]),
    UserModule,
    ReviewModule,
    BankModule,
    SkillModule,
    OrganizationModule,
    UserSubscriptionModule,
  ],
  providers: [ProfileService, PaymentService],
  controllers: [ProfileController, PaymentController],
  exports: [TypeOrmModule],
})
export class ProfileModule {}
