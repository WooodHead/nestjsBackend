import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from 'src/messaging/messaging.module';
import { User } from 'src/user/entities/user.entity';
import { UserModule } from 'src/user/user.module';
import { WebsocketModule } from 'src/websocket/websocket.module';
import { WebSocketService } from 'src/websocket/websocket.service';
import { Notifications } from './entities/notification.entity';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    WebsocketModule,
    TypeOrmModule.forFeature([Notifications, User]),
    forwardRef(() => UserModule),
    MessagingModule,
  ],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
