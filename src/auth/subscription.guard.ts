import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { compareAsc } from 'date-fns';
import { UserSubscriptionService } from 'src/user-subscription/user-subscription.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private userSubscriptionService: UserSubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user.id;
    const userSubscription = await this.userSubscriptionService.getSubscriptionByUserId(
      userId,
    );
    if (compareAsc(userSubscription.expires_at, new Date()) !== -1) {
      return true;
    } else {
      return false;
    }
  }
}
