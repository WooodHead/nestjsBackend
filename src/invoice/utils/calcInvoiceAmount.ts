import { INVOICE_CHARGES } from './../type/invoice';
import { InvoiceParameters } from "../type/invoice";
import { SubscriptionFeatureKeyType } from 'src/subscription/type/subscriptionFeatureType';

export async function calculateFinalInvoiceAmount(initial_amount: number, invoiceParameters): Promise<{
    total_amount: number,
    invoice_charges: INVOICE_CHARGES[]
}> {

    let commissionAmount: number = 0;
    let tdsAmount: number = 0;
    let subTotal: number = 0;
    let serviceChargeAmount: number = 0;
    let invoiceChargesDetails: {
        total_amount: number,
        invoice_charges: INVOICE_CHARGES[]
    } = {
        total_amount: 0,
        invoice_charges: []
    };

    /**
     * tds amount = [(Seller Ask Amount*100)/100 - TDS Percentage] - Seller Ask Amount
     */
    tdsAmount = ((initial_amount * 100) / (100 - Number(invoiceParameters.tds || 0))) - initial_amount;

    /**
     * commission amount = Seller Ask Amount *(Commission %/100)
     */
    commissionAmount = initial_amount * (Number(invoiceParameters.commission || 0) / 100);

    /**
     * service amount = service percent of initial amount
     */
    subTotal = initial_amount + tdsAmount + commissionAmount;
    serviceChargeAmount = subTotal * (Number(invoiceParameters.service_charge || 0) / 100)

    // assign total amount to returning object
    invoiceChargesDetails["total_amount"] = Number((initial_amount + tdsAmount + commissionAmount + serviceChargeAmount).toFixed(2));


    // checks if invoice parameters has all three values
    [SubscriptionFeatureKeyType.service_charge,
        SubscriptionFeatureKeyType.tds,
        SubscriptionFeatureKeyType.commission
    ].forEach(allowedParameter => {
        if (!(Object.keys(invoiceParameters).includes(allowedParameter))) {
            invoiceChargesDetails.invoice_charges.push({
                name: allowedParameter,
                value: 0,
                valueType: "percent",
                amount: 0
            })
        }
    });

    // assign all the invoice extra charges to returning object
    Object.keys(invoiceParameters).forEach(parameter => {

        if (parameter == SubscriptionFeatureKeyType.service_charge) {
            invoiceChargesDetails.invoice_charges.push({
                name: SubscriptionFeatureKeyType.service_charge,
                value: invoiceParameters["service_charge"] || 0,
                valueType: "percent",
                amount: Number(serviceChargeAmount.toFixed(2))
            })
        }
        if (parameter == SubscriptionFeatureKeyType.tds) {
            invoiceChargesDetails.invoice_charges.push({
                name: SubscriptionFeatureKeyType.tds,
                value: invoiceParameters["tds"] || 0,
                valueType: "percent",
                amount: Number(tdsAmount.toFixed(2))
            })
        }
        if (parameter == SubscriptionFeatureKeyType.commission) {
            invoiceChargesDetails.invoice_charges.push({
                name: SubscriptionFeatureKeyType.commission,
                value: invoiceParameters["commission"] || 0,
                valueType: "percent",
                amount: Number(commissionAmount.toFixed(2))
            })
        }
    });

    return invoiceChargesDetails;
}