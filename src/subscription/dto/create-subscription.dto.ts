import { USER_TYPE } from "src/user/type/userType";
import { SUBSCRIPTION_TYPES } from "../type/subscriptionType";

export class CreateSubscriptionDto {
    type: SUBSCRIPTION_TYPES;
    amount: number;
    user_type: USER_TYPE;
}
