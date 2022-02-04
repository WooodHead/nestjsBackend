import {
  SUBSCRIPTION_FEATURE_KEY_TYPE,
  SUBSCRIPTION_FEATURE_VALUE_TYPE,
} from '../type/subscriptionFeatureType';

export class SubscriptionFeatureDto {
  subscription: string;
  feature: string;
  key: SUBSCRIPTION_FEATURE_KEY_TYPE;
  value: string;
  valueType: SUBSCRIPTION_FEATURE_VALUE_TYPE;
}
