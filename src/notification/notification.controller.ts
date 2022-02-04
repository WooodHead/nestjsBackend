import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { NotificationService } from './notification.service';


@UseGuards(JwtAuthGuard)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}
  @Get('/viewall')
  async getMyNotifications(@Req() req) {
    const userId = req.user.id;
    const notifications = await this.notificationService.fetchUserNotifications(
      userId,
    );
    return notifications;
  }

  @Delete('/delete/:notificationId')
  async deleteNotification(@Req() req, @Param() { notificationId }) {
    if (!notificationId) {
      return {
        success: false,
        message: 'Notification ID missing',
      };
    }

    return await this.notificationService.deleteNotification(
      req.user.id,
      notificationId,
    );
  }
}
