import { InvoiceStatus, INVOICE_TYPE } from "../type/invoice";

export class CreateInvoiceDto {
    invoice_for: INVOICE_TYPE;
    invoice_from: string;
    invoice_to: string;
    work_hour?: number;  // compulsary for Hourly lead otherwise set to 1
    subscription_id?: string;
    lead_id?: string;
    request_invoice_amount: number;
    payCurrency?: string; // compulsary for subscription
    initial_invoice_amount?: number;
    final_invoice_amount?: number;
    created_date: Date;
    due_date: Date;
    invoice_status: InvoiceStatus;
}

