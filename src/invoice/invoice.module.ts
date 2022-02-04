import { ProviderPaymentDetails } from './../profile/entities/providerPaymentDetails.entity';
import { PaymentModule } from './../payment/payment.module';
import { PaymentController } from './../payment/payment.controller';
import { InvoiceHash } from './../payment/entities/hash.entity';
import { PaymentService } from '../payment/payment.service';
import { UserModule } from './../user/user.module';
import { Profile } from './../profile/entities/profile.entity';
import { LeadModule } from './../lead/lead.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { forwardRef, Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { Invoice } from './entities/invoice.entity';
import { User } from 'src/user/entities/user.entity';
import { Lead } from 'src/lead/entities/lead.entity';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { UserSubscriptionModule } from 'src/user-subscription/user-subscription.module';
import { WebsocketModule } from 'src/websocket/websocket.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, User, Lead, Profile, ProviderPaymentDetails]),
    UserModule,
    SubscriptionModule,
    UserSubscriptionModule,
    PaymentModule,
    LeadModule,
    WebsocketModule, // For Lead Notifications
    NotificationModule, // For saving leads notification
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [TypeOrmModule, InvoiceService]
})
export class InvoiceModule { }
