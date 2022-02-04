export enum UserType {
    Buyer = 'Buyer',
    Provider = 'Provider'
}
export type USER_TYPES = 'Buyer' | 'Provider';

export enum SubscriptionTypes {
    Regular = 'Regular',
    Silver = 'Silver',
    Gold = 'Gold',
    Concierge = 'Concierge'
}
export type SUBSCRIPTION_TYPES = 'Regular' | 'Silver' | 'Gold' | 'Concierge';

export enum Subscription_Duration {
    three_months = 3,
    six_months = 6,
    one_year = 12,
    two_year = 24,
    five_years = 60
}

export type SUBSCRIPTION_DURATION = [3, 6, 12, 24, 60];