import { WebsocketModule } from './../websocket/websocket.module';
import { NotificationModule } from './../notification/notification.module';
import { LeadModule } from './../lead/lead.module';
import { InvoiceHash } from './entities/hash.entity';
import { InvoiceModule } from './../invoice/invoice.module';
import { forwardRef, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/common';
import { UserSubscription } from 'src/user-subscription/entities/user-subscription.entity';
import { Subscription } from 'src/subscription/entities/subscription.entity';
import { UserSubscriptionHistory } from 'src/user-subscription/entities/user-subscription-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceHash,
      UserSubscription,
      Subscription,
      UserSubscriptionHistory,
    ]),
    forwardRef(() => InvoiceModule),
    LeadModule,
    HttpModule,
    NotificationModule,
    WebsocketModule
     ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
