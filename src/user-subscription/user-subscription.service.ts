import { Subscription } from './../subscription/entities/subscription.entity';
import { User } from './../user/entities/user.entity';
import { UserService } from './../user/user.service';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection, MoreThan } from 'typeorm';
import { CreateUserSubscriptionDto } from './dto/create-user-subscription.dto';
import { UpdateUserSubscriptionDto } from './dto/update-user-subscription.dto';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { SubscriptionStatus } from './type/userSubscriptionTypes';
import { UserModule } from 'src/user/user.module';
import { Cron, CronExpression } from '@nestjs/schedule';
import { format, differenceInDays } from 'date-fns';
import { sendEmail } from 'src/user/util/sendEmail';

@Injectable()
export class UserSubscriptionService {
  constructor(
    @InjectRepository(UserSubscription)
    private userSubscriptionRepository: Repository<UserSubscription>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private subscriptionService: SubscriptionService, // private notificationService: NotificationService,
  ) { }

  async currentUserSubscription(userId: string) {

    try {
      const currentSubscription = await this.userSubscriptionRepository.findOne({
        where: [{ user: userId }],
      });

      if (currentSubscription) {
        const result = {
          success: true,
          id: currentSubscription.subscription.id,
          subscriptionPlan:
            currentSubscription.subscription.duration + ' Months Plan',
          expiresAt: currentSubscription.expires_at,
          amount: currentSubscription.subscription.amount,
        };
        return result;
      } else {
        return {
          success: false,
          error: "No subscription plan exists for the user!"
        }
      }
    } catch (error) {
      console.log(error)
      return {
        success: false,
        error: "Problem in fetching current subscription plan for the user!"
      }
    }
  }

  async create(createUserSubscriptionDto: CreateUserSubscriptionDto) {
    try {
      const userData: User = await this.userService.findUserByUserId(
        createUserSubscriptionDto.user,
      );
      if (!userData) {
        return {
          success: false,
          error: 'No user exists with given user id!',
        };
      }
      const subscriptionData: Subscription = await (
        await this.subscriptionService.findOne(
          createUserSubscriptionDto.subscription,
        )
      ).data;
      if (!subscriptionData) {
        return {
          success: false,
          error: 'Invalid subscription id!',
        };
      }

      let { renewed_at, expires_at, status } = createUserSubscriptionDto;
      let userSubscription = new UserSubscription();
      userSubscription.user = userData;
      userSubscription.subscription = subscriptionData;
      userSubscription.renewed_at = renewed_at;
      userSubscription.expires_at = expires_at;
      userSubscription.status = status;

      const createUserSubscription = await this.userSubscriptionRepository.save(
        userSubscription,
      );
      return {
        success: true,
        error: null,
        data: createUserSubscription,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in adding user subscription!',
      };
    }
  }

  async renewSubscription(subscriptionId: string, renewDuration: number) {
    try {
      let renewalResponse = await getConnection()
        .createQueryBuilder()
        .update(UserSubscription)
        .set({
          renewed_at: new Date(Date.now()),
          expires_at: new Date(
            Date.now() + renewDuration * 24 * 60 * 60 * 1000,
          ),
          status: SubscriptionStatus.active,
        })
        .where('id = :id', { id: subscriptionId })
        .execute();

      if (renewalResponse && renewalResponse.affected == 1) {
        return {
          success: true,
          message: 'Your subscription has been renewed successfully!',
        };
      } else {
        return {
          success: false,
          error: 'Unable to renew the given subscription!',
        };
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Something went wrong in renewal process!',
      };
    }
  }

  async findAll() {
    try {
      const userSubscriptions = await this.userSubscriptionRepository.find();
      return {
        sucess: true,
        error: null,
        data: userSubscriptions,
      };
    } catch (error) {
      console.log(error);
      return {
        sucess: false,
        error: 'Problem in fetching user subscriptions!',
      };
    }
  }

  async findOne(id: string) {
    try {
      const userSubscription = await this.userSubscriptionRepository.findOne(
        id,
      );
      if (userSubscription) {
        return {
          success: true,
          error: null,
          data: userSubscription,
        };
      } else {
        return {
          success: false,
          error: 'No user subscriptions exists with given id!',
        };
      }
    } catch (error) {
      console.log(error);
      return {
        sucess: false,
        error: 'Problem in fetching user subscriptions!',
      };
    }
  }

  async getSubscriptionByUserId(userId: string) {
    try {
      const subscriptionDetails = await this.userSubscriptionRepository.findOne(
        {
          where: {
            user: userId,
          },
        },
      );
      return subscriptionDetails;
    } catch (error) {
      return error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionCron() {
    try {
      const allUserSubscription = await this.userSubscriptionRepository.find({
        where: [{ status: SubscriptionStatus.active }],
      });
      allUserSubscription.forEach(async (subscription) => {
        const expiryDate = subscription.expires_at;
        if (differenceInDays(expiryDate, new Date()) === 15) {
          // send email to the user notifiying account will expire after 15 days.
          sendEmail({
            emailType: 'subscription_about_to_expire',
            email: subscription.user.email,
            messageBody: {
              firstName: subscription.user.firstName,
              lastName: subscription.user.lastName,
              expiryDate: format(subscription.expires_at, 'LLLL d, yyyy'),
              renewLink: `${process.env.ORIGIN}/billing/subscription`,
            },
          });
        } else if (subscription.expires_at < new Date()) {
          await this.userSubscriptionRepository.save({
            ...subscription,
            status: SubscriptionStatus.expired,
          });
          // send email to the user notifying that the account has expired.
          sendEmail({
            emailType: 'subscription_expired',
            email: subscription.user.email,
            messageBody: {
              firstName: subscription.user.firstName,
              lastName: subscription.user.lastName,
              expiryDate: format(subscription.expires_at, 'LLLL d, yyyy'),
              renewLink: `${process.env.ORIGIN}/billing/subscription`,
            },
          });
        }
      });
      return true;
    } catch (err) {
      console.log(err);
    }
  }

  update(id: number, updateUserSubscriptionDto: UpdateUserSubscriptionDto) {
    return `This action updates a #${id} userSubscription`;
  }

  remove(id: number) {
    return `This action removes a #${id} userSubscription`;
  }
}
