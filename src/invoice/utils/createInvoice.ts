import { Invoice } from '../entities/invoice.entity';
import * as PDFDocument from 'pdfkit';
import { SubscriptionFeatureKeyType } from 'src/subscription/type/subscriptionFeatureType';
import { uploadInvoice } from './uploadInvoiceS3';
import { ADToBS } from 'bikram-sambat-js';
let invoiceData;

export async function createInvoice(
  invoice: Invoice,
  providerUserDetails: any,
  buyerUserDetails: any,
  pathToSavePDF: string,
  generateBuyerInvoice: boolean = false,
  invoiceTitle: string,
) {
  if (
    buyerUserDetails.profileType === 'Individual' &&
    providerUserDetails.profileType === 'Organization'
  ) {
    invoiceData = {
      buyerUserDetails: {
        name: buyerUserDetails.firstName + ' ' + buyerUserDetails.lastName,
        address: buyerUserDetails.profile.address1,
        city: buyerUserDetails.profile.city,
        state: buyerUserDetails.profile.state,
        country: buyerUserDetails.profile.country,
        postal_code: buyerUserDetails.profile.zip,
        mobile: buyerUserDetails.profile.mobile,
        identityNumber: buyerUserDetails.identityNumber,
      },
      shipping: {
        name: providerUserDetails.organization.name,
        address: providerUserDetails.organization.officeAddress1,
        city: providerUserDetails.organization.officeCity,
        state: providerUserDetails.organization.officeState,
        country: providerUserDetails.organization.officeCountry,
        mobile: providerUserDetails.organization.officeContactNumber,
        identityNumber: providerUserDetails.organization.vatOrPan,
      },
      items: [
        {
          item: invoice.invoice_for,
          description: invoice.invoice_item.description,
          currency: invoice.invoice_item.payCurrency,
          quantity: invoice.invoice_item.quantity,
          amount: invoice.invoice_item.rate,
        },
      ],
      initial_amount: invoice.initiated_invoice_amount,
      total_amount: invoice.final_invoice_amount,
      leadTitle: invoice.invoice_item.description,
      service_charge:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.service_charge,
        ),
      tds:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.tds,
        ),
      commission:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.commission,
        ),
      invoice_date: invoice.created_date,
      invoice_due_date: invoice.due_date,
      invoice_nr: invoice.invoice_number,
    };
  }

  if (
    buyerUserDetails.profileType === 'Organization' &&
    providerUserDetails.profileType === 'Individual'
  ) {
    invoiceData = {
      buyerUserDetails: {
        name: buyerUserDetails.organization.name,
        address: buyerUserDetails.organization.officeAddress1,
        city: buyerUserDetails.organization.officeCity,
        state: buyerUserDetails.organization.officeState,
        country: buyerUserDetails.organization.officeCountry,
        mobile: buyerUserDetails.organization.officeContactNumber,
        identityNumber: buyerUserDetails.organization.vatOrPan,
      },
      shipping: {
        name:
          providerUserDetails.firstName + ' ' + providerUserDetails.lastName,
        address: providerUserDetails.profile.address1,
        city: providerUserDetails.profile.city,
        state: providerUserDetails.profile.state,
        country: providerUserDetails.profile.country,
        postal_code: providerUserDetails.profile.zip,
        mobile: providerUserDetails.profile.mobile,
        identityNumber: providerUserDetails.identityNumber,
      },
      items: [
        {
          item: invoice.invoice_for,
          description: invoice.invoice_item.description,
          currency: invoice.invoice_item.payCurrency,
          quantity: invoice.invoice_item.quantity,
          amount: invoice.invoice_item.rate,
        },
      ],
      initial_amount: invoice.initiated_invoice_amount,
      total_amount: invoice.final_invoice_amount,
      leadTitle: invoice.invoice_item.description,
      service_charge:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.service_charge,
        ),
      tds:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.tds,
        ),
      commission:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.commission,
        ),
      invoice_date: invoice.created_date,
      invoice_due_date: invoice.due_date,
      invoice_nr: invoice.invoice_number,
    };
  }

  if (
    buyerUserDetails.profileType === 'Individual' &&
    providerUserDetails.profileType === 'Individual'
  ) {
    invoiceData = {
      buyerUserDetails: {
        name: buyerUserDetails.firstName + ' ' + buyerUserDetails.lastName,
        address: buyerUserDetails.profile.address1,
        city: buyerUserDetails.profile.city,
        state: buyerUserDetails.profile.state,
        country: buyerUserDetails.profile.country,
        postal_code: buyerUserDetails.profile.zip,
        mobile: buyerUserDetails.profile.mobile,
        identityNumber: providerUserDetails.identityNumber,
      },
      shipping: {
        name:
          providerUserDetails.firstName + ' ' + providerUserDetails.lastName,
        address: providerUserDetails.profile.address1,
        city: providerUserDetails.profile.city,
        state: providerUserDetails.profile.state,
        country: providerUserDetails.profile.country,
        postal_code: providerUserDetails.profile.zip,
        mobile: providerUserDetails.profile.mobile,
        identityNumber: providerUserDetails.identityNumber,
      },
      items: [
        {
          item: invoice.invoice_for,
          description: invoice.invoice_item.description,
          currency: invoice.invoice_item.payCurrency,
          quantity: invoice.invoice_item.quantity,
          amount: invoice.invoice_item.rate,
        },
      ],
      initial_amount: invoice.initiated_invoice_amount,
      total_amount: invoice.final_invoice_amount,
      leadTitle: invoice.invoice_item.description,
      service_charge:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.service_charge,
        ),
      tds:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.tds,
        ),
      commission:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.commission,
        ),
      invoice_date: invoice.created_date,
      invoice_due_date: invoice.due_date,
      invoice_nr: invoice.invoice_number,
    };
  }

  if (
    buyerUserDetails.profileType === 'Organization' &&
    providerUserDetails.profileType === 'Organization'
  ) {
    invoiceData = {
      buyerUserDetails: {
        name: buyerUserDetails.organization.name,
        address: buyerUserDetails.organization.officeAddress1,
        city: buyerUserDetails.organization.officeCity,
        state: buyerUserDetails.organization.officeState,
        country: buyerUserDetails.organization.officeCountry,
        mobile: buyerUserDetails.organization.officeContactNumber,
        identityNumber: buyerUserDetails.organization.vatOrPan,
      },
      shipping: {
        name: providerUserDetails.organization.name,
        address: providerUserDetails.organization.officeAddress1,
        city: providerUserDetails.organization.officeCity,
        state: providerUserDetails.organization.officeState,
        country: providerUserDetails.organization.officeCountry,
        mobile: providerUserDetails.organization.officeContactNumber,
        identityNumber: providerUserDetails.organization.vatOrPan,
      },
      items: [
        {
          item: invoice.invoice_for,
          description: invoice.invoice_item.description,
          currency: invoice.invoice_item.payCurrency,
          quantity: invoice.invoice_item.quantity,
          amount: invoice.invoice_item.rate,
        },
      ],
      initial_amount: invoice.initiated_invoice_amount,
      total_amount: invoice.final_invoice_amount,
      leadTitle: invoice.invoice_item.description,
      service_charge:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.service_charge,
        ),
      tds:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.tds,
        ),
      commission:
        invoice.invoice_charges &&
        invoice.invoice_charges.find(
          (invoice_charge) =>
            invoice_charge.name == SubscriptionFeatureKeyType.commission,
        ),
      invoice_date: invoice.created_date,
      invoice_due_date: invoice.due_date,
      invoice_nr: invoice.invoice_number,
    };
  }

  try {
    let doc = new PDFDocument({ size: 'A4', margin: 50 });
    if (generateBuyerInvoice) {
      await generateHeader(doc);
    } else {
      const customerInformationTop = 40;
      doc
        .fontSize(14)
        .font('Helvetica')
        .text('Requested By: ', 50, customerInformationTop)
        .fontSize(10)
        .font('Helvetica')
        .text(invoiceData.shipping.name, 50, customerInformationTop + 20)
        .text(
          invoiceData.shipping.address + ', ' + invoiceData.shipping.country,
          50,
          customerInformationTop + 35,
        )
        .text(invoiceData.shipping.mobile, 50, customerInformationTop + 50)
        .text('Pan No: ', 50, customerInformationTop + 65)
        .fontSize(10)
        .text(
          invoiceData.shipping.identityNumber,
          90,
          customerInformationTop + 65,
        );
    }
    await generateCustomerInformation(
      doc,
      invoiceData,
      invoiceTitle,
      generateBuyerInvoice,
    );
    await generateInvoiceTable(doc, invoiceData, generateBuyerInvoice);
    await generateFooter(doc, generateBuyerInvoice);
    doc.end();
    return await uploadInvoice(doc, pathToSavePDF, generateBuyerInvoice);
    // console.log(s3UploadResponse);
    // doc.pipe(fs.createWriteStream('src/_assets/invoices/' + pathToSavePDF));
  } catch (error) {
    return error;
  }
}

async function generateHeader(doc) {
  doc
    .rect(40, 35, 70, 60)
    .fill('#782b8f')
    .image('src/_assets/sakchha-logo.png', 50, 45, { width: 50 })
    .fontSize(20)
    .text('Sakchha', 120, 57)
    .fontSize(10)
    .text('Sakchha', 200, 50, { align: 'right' })
    .text('Kathmandu', 200, 65, { align: 'right' })
    .text('Kathmandu, Nepal, 10025', 200, 80, { align: 'right' })
    .moveDown();
}

async function generateCustomerInformation(
  doc,
  invoice,
  invoiceTitle,
  generateBuyerInvoice: boolean,
) {
  doc.fillColor('#444444').fontSize(20).text(invoiceTitle, 50, 160);

  generateHr(doc, 185);

  let customerInformationTop = 200;

  // buyer information section
  if (generateBuyerInvoice) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Customer name: ', 50, customerInformationTop)
      .text(invoiceData.buyerUserDetails.name, 150, customerInformationTop)
      .text('Address: ', 50, customerInformationTop + 15)
      .text(
        invoiceData.shipping.address + ', ' + invoiceData.shipping.country,
        150,
        customerInformationTop + 15,
      )
      .text('Registration No: ', 50, customerInformationTop + 30)
      .text(
        invoiceData.buyerUserDetails.identityNumber,
        150,
        customerInformationTop + 30,
      )
      .moveDown();

    // generateHr(doc, 245);

    customerInformationTop = customerInformationTop + 75;
  }

  doc
    .fontSize(10)
    .text('Proforma Invoice:', 50, customerInformationTop)
    .font('Helvetica-Bold')
    .text(invoice.invoice_nr, 150, customerInformationTop)
    .font('Helvetica')
    .text('Date:', 50, customerInformationTop + 15)
    .text(formatDate(invoice.invoice_date), 150, customerInformationTop + 15)
    .text('Due Date:', 50, customerInformationTop + 30)
    .text(
      formatDate(invoice.invoice_due_date),
      150,
      customerInformationTop + 30,
    );

  if (generateBuyerInvoice) {
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('On Behalf of: ', 300, customerInformationTop)
      .fontSize(10)
      .font('Helvetica')
      .text(invoice.shipping.name, 300, customerInformationTop + 15)
      .fontSize(10)
      .font('Helvetica')
      .text(
        invoiceData.shipping.address + ', ' + invoiceData.shipping.country,
        300,
        customerInformationTop + 30,
      )
      .text(invoice.shipping.mobile, 300, customerInformationTop + 45)
      .moveDown();

    customerInformationTop = customerInformationTop + 60;
  } else {
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('To: ', 300, customerInformationTop)
      .fontSize(10)
      .font('Helvetica')
      .text('Sakchha Technology Pvt. Ltd.', 300, customerInformationTop + 15)
      .fontSize(10)
      .font('Helvetica')
      .text('Kathmandu, Nepal', 300, customerInformationTop + 30)
      .moveDown();

    customerInformationTop = customerInformationTop + 45;
  }

  generateHr(doc, 262);
}

async function generateInvoiceTable(doc, invoice, generateBuyerInvoice) {
  let i;
  const invoiceTableTop = 350;

  doc.font('Helvetica-Bold');
  generateTableRow(
    doc,
    invoiceTableTop,
    'Item',
    'Description',
    'Unit Cost',
    'Quantity',
    'Line Total',
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font('Helvetica');

  for (i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.item,
      item.description,
      formatCurrency(item.amount),
      item.quantity,
      formatCurrency(item.amount * item.quantity),
    );

    generateHr(doc, position + 20);
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 30;

  // generateTableRow(
  //     doc,
  //     subtotalPosition,
  //     "",
  //     "",
  //     "Subtotal",
  //     "",
  //     formatCurrency(item.amount * item.quantity)
  // );

  if (generateBuyerInvoice) {
    const tdsPosition = subtotalPosition + 25;
    const commissionPosition = tdsPosition + 20;
    const serviceChargePosition = commissionPosition + 20;
    const totalPosition = serviceChargePosition + 30;
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(`TDS(${invoice.tds.value}%)`, 350, tdsPosition)
      .text(`${invoice.tds.amount}`, 500, tdsPosition)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(
        `Service Charge(${invoice.commission.value}%)`,
        350,
        commissionPosition,
      )
      .text(`${invoice.commission.amount}`, 500, commissionPosition)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(
        `Remittance Charge(${invoice.service_charge.value}%)`,
        350,
        serviceChargePosition,
      )
      .text(`${invoice.service_charge.amount}`, 500, serviceChargePosition);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Total Amount', 350, totalPosition)
      .text(`${invoice.total_amount}`, 500, totalPosition);

    // generateTableRow(
    //   doc,
    //   totalPosition,
    //   '',
    //   '',
    //   '',
    //   'Total Amount',
    //   formatCurrency(invoice.total_amount),
    // );
  } else {
    const paidToDatePosition = subtotalPosition + 30;
    doc.font('Helvetica-Bold');
    generateTableRow(
      doc,
      paidToDatePosition,
      '',
      '',
      '',
      'Total Amount',
      formatCurrency(invoice.initial_amount),
    );
  }
}

async function generateFooter(doc, generateBuyerInvoice) {
  if (generateBuyerInvoice) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        'This invoice is generated against ' +
          invoiceData.leadTitle +
          ', completed by ' +
          invoiceData.shipping.name +
          '.',
        50,
        550,
        { align: 'center', width: 500 },
      );
  }
  doc
    .fontSize(10)
    .text(
      'Payment is due within 30 days. Thank you for your business.',
      50,
      770,
      { align: 'center', width: 500 },
    );
}

function generateTableRow(
  doc,
  y,
  item,
  description,
  unitCost,
  quantity,
  lineTotal,
) {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(description, 150, y)
    .text(unitCost, 280, y, { width: 90, align: 'right' })
    .text(quantity, 350, y, { width: 100, align: 'right' })
    .text(lineTotal, 0, y, { align: 'right' });
}

function generateHr(doc, y) {
  doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

function formatCurrency(cents) {
  if (invoiceData.items[0].currency == 'NPR') {
    return 'Rs. ' + cents.toFixed(2);
  } else {
    return '$' + cents.toFixed(2);
  }
}

function formatDate(date) {
  try {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    let englishDate = year + '/' + month + '/' + day;
    let nepaliDate = ADToBS(englishDate);
    return nepaliDate;
  } catch (error) {
    console.error(error);
  }
}
