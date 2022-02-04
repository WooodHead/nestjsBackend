import { Module, Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from 'config/database';
import { UserModule } from './user/user.module';
import { ProfileModule } from './profile/profile.module';
import { AuthModule } from './auth/auth.module';
import { LeadModule } from './lead/lead.module';
import { SkillModule } from './skill/skill.module';
import { InvoiceModule } from './invoice/invoice.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { FeatureModule } from './feature/feature.module';
import { UserSubscriptionModule } from './user-subscription/user-subscription.module';
import { WebsocketModule } from './websocket/websocket.module';
import { PaymentModule } from './payment/payment.module';
import { ReviewModule } from './review/review.module';
import { BankModule } from './bank/bank.module';
import { OrganizationModule } from './organization/organization.module';
import { WinstonModule } from 'nest-winston';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { MessagingModule } from './messaging/messaging.module';
import * as winston from 'winston';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'prod'
          ? ['.production.env']
          : process.env.NODE_ENV === 'staging'
          ? ['.staging.env']
          : ['.development.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    WinstonModule.forRootAsync({
      useFactory: () => ({
        format: winston.format.json(),
        transports: [
          new winston.transports.File({
            filename: process.env.ERROR_LOG_FILE,
            level: 'error',
          }),
          new winston.transports.File({
            filename: process.env.COMBINED_LOG_FILE,
          }),
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    UserModule,
    ProfileModule,
    AuthModule,
    LeadModule,
    SkillModule,
    InvoiceModule,
    SubscriptionModule,
    FeatureModule,
    UserSubscriptionModule,
    WebsocketModule,
    PaymentModule,
    ReviewModule,
    BankModule,
    OrganizationModule,
    ElasticsearchModule,
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [AppService, Logger],
})
export class AppModule {}
