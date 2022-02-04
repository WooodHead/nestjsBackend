import { SubscriptionStatus } from "../type/userSubscriptionTypes";

export class CreateUserSubscriptionDto {
    user: string;
    subscription: string;
    renewed_at: Date;
    expires_at: Date;
    status: SubscriptionStatus;
}
