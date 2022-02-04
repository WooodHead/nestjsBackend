import { SUBSCRIPTION_FEATURE_KEY_TYPE } from './../../subscription/type/subscriptionFeatureType';

export type INVOICE_TYPE = 'Leads' | 'Subscription';
export enum InvoiceType {
    Leads = 'Leads',
    Subscription = 'Subscription'
}

export interface INVOICE_ITEM_TYPE {
    description: string, 
    rate: number, 
    payCurrency: string,
    quantity: number,
    line_total: number
}

export enum InvoiceStatus {
    Raised = 'raised',
    InEscrow = 'in escrow',
    Due = "due",
    InReview = "in review",
    Paid = 'paid',
    Failed = 'failed',
    Completed = 'completed'
}

export interface InvoiceParameters {
    key: SUBSCRIPTION_FEATURE_KEY_TYPE,
    value: string | number
}

export interface INVOICE_CHARGES {
    name: string,
    value: number,
    valueType: string,
    amount: number
}