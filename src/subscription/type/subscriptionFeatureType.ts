export enum SubscriptionFeatureKeyType {
    service_charge = 'service_charge',
    commission = 'commission', 
    tds = 'tds'
}

export type SUBSCRIPTION_FEATURE_KEY_TYPE = 'service_charge' | 'commission' | 'tds';


export enum SubscriptionFeatureValueType {
    amount = 'amount',
    percent = 'percent',
    boolean = 'boolean',
    string = 'string'
}

export type SUBSCRIPTION_FEATURE_VALUE_TYPE = 'amount' | 'percent' | 'boolean' | 'string';
