import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { SentryInterceptor } from 'src/sentry.interceptor';

import { filterXSS } from 'xss';
import { EmailData } from './type/emailType';
import { RegisterUserDto } from './type/registerInput';
import { UserService } from './user.service';

@UseInterceptors(SentryInterceptor)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('create')
  async createUser(@Body() registerUserDto: RegisterUserDto) {
    Object.keys(registerUserDto).forEach((key) => {
      registerUserDto[key] = filterXSS(registerUserDto[key]);
    });
    return this.userService.validateRegisterInput(registerUserDto);
  }

  @Get('activate/:token')
  async activateAccount(@Param('token') token: string) {
    return this.userService.verifyActivationToken(token);
  }

  @Post('resend-activation')
  async resendActivationToken(@Body() { email }: { email: string }) {
    return this.userService.resendActivationEmail(email);
  }
}
