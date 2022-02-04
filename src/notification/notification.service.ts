import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { User } from 'src/user/entities/user.entity';
import { saveLogs } from 'src/util/logger';
import { ObjectID, Repository } from 'typeorm';
import { Notifications } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,
    @InjectRepository(Notifications)
    private notificationsRepository: Repository<Notifications>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Fetch user notification
  async fetchUserNotifications(userId: string) {
    try {
      const notifications = await this.notificationsRepository.find({
        where: [{ user: userId }],
        order: {
          createdAt: 'DESC',
        },
      });
      if (notifications) {
        return {
          success: true,
          notifications,
        };
      }
      return {
        success: false,
      };
    } catch (err) {
      saveLogs(
        this.logger,
        'at finding user notification for user',
        err,
        userId,
      );
      return {
        success: false,
      };
    }
  }

  // Save notification
  async saveNotification(userId: string, message: string) {
    try {
      const user = await this.userRepository.findOne({ id: userId });
      const notification = new Notifications();
      notification.message = message;
      notification.user = user;
      return await this.notificationsRepository.save(notification);
    } catch (err) {
      saveLogs(this.logger, 'at saving notification of a user', err, userId);
      return { success: false };
    }
  }

  // Delete notification
  async deleteNotification(userId, notificationId: string) {
    try {
      if (
        await this.notificationsRepository.delete({
          id: notificationId,
          user: userId,
        })
      ) {
        return { success: true };
      }
      throw new Error();
    } catch (err) {
      saveLogs(this.logger, 'at deleting notification of a user', err, userId);
      return {
        success: false,
      };
    }
  }
}
