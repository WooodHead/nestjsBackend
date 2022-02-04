import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { jwtConstants } from 'src/auth/constants/secret';
import { MessagingModule } from 'src/messaging/messaging.module';
import { NotificationModule } from 'src/notification/notification.module';
import { UserModule } from 'src/user/user.module';
import { SocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
    }),
    UserModule,
    AuthModule,
    forwardRef(() => NotificationModule),
    forwardRef(() => MessagingModule),
  ],
  providers: [WebSocketService, SocketGateway],
  exports: [SocketGateway, WebSocketService],
})
export class WebsocketModule {}
