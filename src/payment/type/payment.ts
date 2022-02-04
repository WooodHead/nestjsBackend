import { INVOICE_TYPE } from 'src/invoice/type/invoice';
import { SUBSCRIPTION_FEATURE_KEY_TYPE } from 'src/subscription/type/subscriptionFeatureType';

export interface HBLResponse {
  paymentGatewayID: string;
  respCode: string;
  fraudCode: string;
  Pan: string;
  Amount: string;
  invoiceNo: string;
  tranRef: string;
  approvalCode: string;
  Eci: string;
  dateTime: string;
  Status: string;
  failReason: string;
  userDefined1: INVOICE_TYPE;
  userDefined2: string;
  userDefined3: string;
  userDefined4: string;
  userDefined5: string;
  noteToMerchant: string;
  hashValue: string;
}

interface SynergyInvoiceItem {
  ItemId?: string;
  ItemName: string;
  Quantity: number;
  UnitPrice: number;
  TotalPrice: number;
}

interface SynergyInvoiceCharge {
  ChargeType: string;
  ChargeAmount: number;
}

export interface SynergyInvoice {
  ManualNo: string;
  CustomerId: string;
  CustomerName: string;
  SalesInvoiceLines: Array<SynergyInvoiceItem>;
  Charges: Array<SynergyInvoiceCharge>;
  CustomeAddress: string;
  CustomerPhone: string;
  CustomerEmail: string;
  CustomerPanPANNo: string;
  PaymentMode: string;
}
