export type EMAIL_TYPE =
  | 'account_activation'
  | 'professional_subscription'
  | 'password_reset'
  | 'generate_provider_invoice'
  | 'generate_buyer_invoice'
  | 'generate_synergy_invoice'
  | 'subscription_about_to_expire'
  | 'subscription_expired'
  | 'sakchha_professional_subscription';

export interface EmailData {
  emailType: EMAIL_TYPE;
  email: string;
  messageBody: Object;
}
