export type CURRENCY_CODES = '524' | '840'
export class PaymentDto {
    invoiceNo: string;
    amount: Number;
    currencyCode: CURRENCY_CODES;
}

export interface RequestHash {
    invoiceNo: string
    amount: Number, 
    currencyCode: CURRENCY_CODES
}

export interface ResponseHash {
   paymentGatewayID: string,
   respCode: string,
   fraudCode: string,
   Pan: string,
   Amount: string,
   invoiceNo: string,
   tranRef: string,
   approvalCode: string,
   Eci: string,
   dateTime: string,
   Status: string
}