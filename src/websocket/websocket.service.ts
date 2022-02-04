import {
  Injectable,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Injectable()
export class WebSocketService {
  constructor(private readonly authService: AuthService) {}
  async validateUser(socket: Socket) {
    try {
      const token = socket.handshake.query.Authorization;
      const user = await this.authService.getUserFromAuthenticationToken(
        token as string,
      );
      if (!user) {
        throw new WsException('Invalid credentials');
      }
      return user;
    } catch (err) {
      throw new UnauthorizedException('Invalid authentication. Try again');
    }
  }
}
