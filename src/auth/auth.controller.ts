import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { ForgotPasswordDto, ResetPasswordDto } from './type/resetPasswordDto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('refresh_')
  async validateRefreshToken(@Req() req) {
    return this.authService.validateRefreshToken(req.headers.authorization);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('usertype')
  async getUserType(@Req() req) {
    const userId = req.user.id;
    return this.authService.findUserType(userId);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Get('reset-password/:token')
  async verifyToken(@Param('token') token: string) {
    return this.authService.verifyResetPasswordToken(token);
  }

  @Post('reset-password/:token')
  async resetPassword(
    @Body() passwordDto: ResetPasswordDto,
    @Param('token') token: string,
  ) {
    return this.authService.resetPassword(token, passwordDto.newPassword);
  }
}
