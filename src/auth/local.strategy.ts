import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(email: string, password: string): Promise<any> {
    const userResponse = await this.authService.validateUser(email, password);
    if (!userResponse.success) {
      if (!userResponse.message) {
        throw new UnauthorizedException(`Email or Password didn't match.`);
      }
      if (userResponse.message) {
        throw new UnauthorizedException('not-activated');
      }
    }
    return userResponse.result;
  }
}
