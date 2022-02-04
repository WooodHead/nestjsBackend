import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { from } from 'rxjs';
import { Socket, Server } from 'socket.io';
import { MessagingService } from 'src/messaging/messaging.service';
import { NotificationService } from 'src/notification/notification.service';
import { UserService } from 'src/user/user.service';
import { SimpleConsoleLogger } from 'typeorm';
import { date } from 'yup/lib/locale';
import { WebSocketService } from './websocket.service';

@WebSocketGateway({ tranports: ['websocket'] })
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    readonly WebSocketService: WebSocketService,
    readonly userService: UserService,
    readonly notificationService: NotificationService,
    readonly messagingService: MessagingService,
  ) {}

  id = null;
  logger = new Logger(SocketGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('Initiated');
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log('Inside handle connection');
      const { id } = await this.WebSocketService.validateUser(client);
      this.id = id;
      client.join(id);
      const userRooms = await this.messagingService.findUserRooms(id);
      userRooms.success &&
        userRooms.rooms.map((r, i) => {
          client.join(r.roomId);
        });
    } catch (err) {
      console.log('facing issue at handle connection');
    }
  }

  async handleDisconnect(client) {
    try {
      const { id } = await this.WebSocketService.validateUser(client);
      // Update user logout time upon disconnecting
      await this.userService.storeLogoutTime(id);
    } catch (err) {
      console.log('facing issue at handle disconnect');
    }
  }

  @SubscribeMessage('join-room')
  async joinRoom(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.join(data.roomId);
  }

  @SubscribeMessage('message')
  async joinUserToRoom(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // check if user sending message to this room does exist inside the room or not.
      const { id: senderUserId } = await this.WebSocketService.validateUser(
        client,
      );
      await this.messagingService.saveMessage({
        senderId: senderUserId,
        message: data.message,
        date: data.date,
        roomId: data.roomId,
      });
      // Fetching users of the current room
      const roomInfo = await this.messagingService.findRoom(data.roomId);
      const receiverUserId =
        senderUserId !== roomInfo.room.buyer.id
          ? roomInfo.room.buyer.id
          : roomInfo.room.provider.id;
      this.server.to(data.roomId).emit('Message', {
        date: Date.now(),
        message: data.message,
        roomId: data.roomId,
        senderId: senderUserId,
      });
    } catch (err) {
      console.log(err);
    }
  }
}
