import { SUBSCRIPTION_FEATURE_KEY_TYPE, SUBSCRIPTION_FEATURE_VALUE_TYPE } from "../type/subscriptionFeatureType";

export class UpdateSubscriptionFeatureDto {
    key: SUBSCRIPTION_FEATURE_KEY_TYPE;
    value: string;
}