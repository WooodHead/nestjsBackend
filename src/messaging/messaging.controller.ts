import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagingService } from './messaging.service';

@UseGuards(JwtAuthGuard)
@Controller('message')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Post('db-join-room')
  async joinRoom(@Request() req, @Body() body) {
    const { id } = req.user;
    return this.messagingService.joinRoom(id, body.provider);
  }

  @Get('all-rooms')
  async allRomms(@Request() req) {
    const { id } = req.user;
    return this.messagingService.allChats(id);
  }

  @Get('room-messages/:roomId')
  async fetchMessages(@Request() req, @Param() param) {
    const { id } = req.user;
    return this.messagingService.findRoomMessage(id, param.roomId);
  }

  @Post('room-messages/pagination/:roomId')
  async fetchMessagesPagination(@Param() param, @Body() body) {
    return this.messagingService.findRoomMessagePagination(
      param.roomId,
      body.lastEvaluatedKey,
    );
  }
}
