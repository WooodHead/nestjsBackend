import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { User } from 'src/user/entities/user.entity';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import {
  ForgotPasswordResponse,
  VerifyResetToken,
} from './type/forgotPasswordResponse';
import { jwtConstants } from './constants/secret';
import { sendEmail } from 'src/user/util/sendEmail';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { saveLogs } from 'src/util/logger';
import { UserSubscriptionService } from '../user-subscription/user-subscription.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,
    private userService: UserService,
    private jwtService: JwtService,
    private userSubscriptionService: UserSubscriptionService,
  ) {}

  // Added for websockets
  public async getUserFromAuthenticationToken(token: string) {
    try {
      const payload: any = this.jwtService.verify(token.split(' ')[1]);
      if (payload.id) {
        return this.userService.findUserByUserId(payload.id);
      }
    } catch (err) {
      saveLogs(this.logger, 'at getting user using jwt token', err);
      throw new UnauthorizedException('Session Expired. Please login again');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userService.findUserByUserEmail(email);
      if (user) {
        if (
          (await argon2.verify(user.password, password)) &&
          user.accountActivated
        ) {
          const { password, ...result } = user;
          return { success: true, result };
        } else if (
          (await argon2.verify(user.password, password)) &&
          !user.accountActivated
        ) {
          return { success: false, message: 'not-activated' };
        } else {
          return { success: false, message: null };
        }
      }
      return { success: false, message: null };
    } catch (err) {
      saveLogs(this.logger, 'at validating user using email and password', err);
    }
  }

  async validateRefreshToken(refreshToken: string) {
    try {
      const newToken = refreshToken.split(' ');
      const token = newToken[1];
      this.jwtService.verify(token, { ignoreExpiration: false });
      const decodedJWT = await this.jwtService.decode(token, {
        complete: true,
      });
      const id: string = decodedJWT['payload'].id;
      const payload = { id };
      const returnObj = {
        success: true,
        access_token: this.jwtService.sign(payload, {
          // secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_LIFE,
        }),
        refresh_token: this.jwtService.sign(payload, {
          // secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_LIFE,
        }),
      };
      return returnObj;
    } catch (err) {
      throw new ForbiddenException('Token expired.Log in again.');
    }
  }

  async login(user: User) {
    // const userSubscription = await this.userSubscriptionService.getSubscriptionByUserId(
    //   user.id,
    // );
    const payload = {
      id: user.id,
      // subscription: userSubscription.status
    };
    return {
      access_token: this.jwtService.sign(payload, {
        // secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_LIFE,
      }),
      refresh_token: this.jwtService.sign(payload, {
        // secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_LIFE,
      }),
    };
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const user = await this.userService.findUserByUserEmail(email);
    if (user) {
      //create token
      const passwordResetToken = this.jwtService.sign(
        { id: user.id },
        {
          expiresIn: process.env.JWT_PASSWORD_RESET_LIFE,
          secret: user.password,
        },
      );
      const passwordResetURL = `${process.env.ORIGIN}/account/reset-password/${passwordResetToken}`;
      const { firstName, lastName, email } = user;
      sendEmail({
        emailType: 'password_reset',
        email,
        messageBody: { firstName, lastName, resetURL: passwordResetURL },
      });
      return { success: true };
    }
    return { success: true };
  }

  async verifyResetPasswordToken(token: string): Promise<VerifyResetToken> {
    try {
      const decodedJWT = await this.jwtService.decode(token, {
        complete: true,
      });
      const id: string = decodedJWT['payload'].id;
      const user = await this.userService.findUserByUserId(id);
      if (!user) {
        throw new NotFoundException();
      }
      if (user) {
        this.jwtService.verify(token, {
          ignoreExpiration: false,
          secret: user.password,
        });
        return {
          verified: true,
        };
      }
    } catch (err) {
      throw new UnauthorizedException();
    }
  }

  async resetPassword(token: string, password: string): Promise<any> {
    try {
      const decodedJWT = await this.jwtService.decode(token, {
        complete: true,
      });
      const id: string = decodedJWT['payload'].id;
      return this.userService.resetPassword(id, password);
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async findUserType(userId: string) {
    return this.userService.findUserType(userId);
  }
}
