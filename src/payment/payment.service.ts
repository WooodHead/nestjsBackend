import { sendEmail } from './../user/util/sendEmail';
import { InvoiceType } from './../invoice/type/invoice';
import { ProviderLeadService } from './../lead/lead.provider.service';
import { HBLResponse, SynergyInvoice } from './type/payment';
import { InvoiceHash } from './entities/hash.entity';
import { HttpService, Injectable } from '@nestjs/common';
import { PaymentDto } from './dto/payment.dto';
import { addMonths } from 'date-fns';

import {
  generateRequestHashValue,
  generateResponseHash,
} from './utils/paymentUtil';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice } from 'src/invoice/entities/invoice.entity';
import { Repository, getConnection, getRepository } from 'typeorm';
import { InvoiceStatus } from 'src/invoice/type/invoice';
import { Profile } from 'src/profile/entities/profile.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { UserSubscription } from 'src/user-subscription/entities/user-subscription.entity';
import { Subscription } from 'src/subscription/entities/subscription.entity';
import { SubscriptionStatus } from 'src/user-subscription/type/userSubscriptionTypes';
import { UserSubscriptionHistory } from 'src/user-subscription/entities/user-subscription-history.entity';
import { User } from 'src/user/entities/user.entity';
import { NotificationService } from 'src/notification/notification.service';
import { SocketGateway } from 'src/websocket/websocket.gateway';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(InvoiceHash)
    private invoiceHashRepository: Repository<InvoiceHash>,
    @InjectRepository(Invoice) private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(UserSubscription)
    private userSubscriptionRepository: Repository<UserSubscription>,
    @InjectRepository(UserSubscriptionHistory)
    private userSubscriptionHistory: Repository<UserSubscriptionHistory>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private leadService: ProviderLeadService,
    private httpService: HttpService,
    private readonly notificationService: NotificationService,
    private readonly socketService: SocketGateway,
  ) {}

  async generateHash(paymentData: PaymentDto) {
    try {
      let invoice = await this.invoiceRepository.findOne({
        where: {
          invoice_number: paymentData.invoiceNo,
        },
      });

      if (!invoice) {
        return {
          success: false,
          message: 'No invoice exists for given invoice number!',
        };
      }

      let invoiceId = await this.invoiceHashRepository.findOne({
        where: {
          invoice: invoice.id,
        },
        select: ['id'],
      });

      // in case of hash already exists for given invoice no
      if (invoiceId && invoiceId.id) {
        let hashGenValue = await generateRequestHashValue({
          invoiceNo: paymentData.invoiceNo,
          amount: paymentData.amount,
          currencyCode: paymentData.currencyCode,
        });
        await getConnection()
          .createQueryBuilder()
          .update(InvoiceHash)
          .set({
            hashValue: hashGenValue,
          })
          .where('id = :id', { id: invoiceId.id })
          .execute();

        return {
          success: true,
          message: 'Hash updated successfully!',
          data: {
            merchantKey: process.env.PAYMENT_GATEWAY_ID,
            hashValue: hashGenValue,
          },
        };
      }

      let hashGenValue = await generateRequestHashValue({
        invoiceNo: paymentData.invoiceNo,
        amount: paymentData.amount,
        currencyCode: paymentData.currencyCode,
      });
      let invoiceHash = new InvoiceHash();
      invoiceHash.invoice = invoice;
      invoiceHash.hashValue = hashGenValue;
      await this.invoiceHashRepository.save(invoiceHash);
      return {
        success: true,
        message: 'Hash generated successfully!',
        data: {
          merchantKey: process.env.PAYMENT_GATEWAY_ID,
          hashValue: hashGenValue,
        },
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in fetching hash info!',
      };
    }
  }

  async handlePaymentRespone(paymentResponseHBL: any) {
    try {
      // TODO 0: Check hash first
      let generatedResponseHash = await generateResponseHash({
        paymentGatewayID: paymentResponseHBL.paymentGatewayID,
        respCode: paymentResponseHBL.respCode,
        fraudCode: paymentResponseHBL.fraudCode,
        Pan: paymentResponseHBL.Pan,
        Amount: paymentResponseHBL.Amount,
        invoiceNo: paymentResponseHBL.invoiceNo,
        tranRef: paymentResponseHBL.tranRef,
        approvalCode: paymentResponseHBL.approvalCode,
        Eci: paymentResponseHBL.Eci,
        dateTime: paymentResponseHBL.dateTime,
        Status: paymentResponseHBL.Status,
      });

      console.log('Generated response hash: ' + generatedResponseHash);
      console.log('Response hash from HBL: ' + paymentResponseHBL.hashValue);

      if (!generatedResponseHash) {
        console.log('Problem in generating response payment!');
        return {
          success: false,
          message: 'Problem in generating response payment!',
        };
      }

      if (generatedResponseHash !== paymentResponseHBL.hashValue) {
        console.log('Interrupted response from HBL!');
        return {
          success: false,
          message: 'Interrupted response from HBL!',
        };
      }

      if (paymentResponseHBL.respCode != '00') {
        await getRepository(Invoice)
          .createQueryBuilder('Invoice')
          .update(Invoice)
          .set({
            invoice_status: InvoiceStatus.Failed,
            buyer_remarks: `Sorry, your payment cannot be processed. Please check the status of your transaction with merchant or card issuer bank before placing another order. ERROR CODE: ${paymentResponseHBL.respCode}`,
          })
          .where('id = :id', { id: paymentResponseHBL.userDefined2 })
          .execute();
        console.log('Payment failed due to invalid response code!');

        return {
          success: false,
          message: 'Payment failed due to invalid response code!',
        };
      }

      // check if paid amount is greater than or equal to invoice amount
      let isAmountValid: boolean = await this.checkPaymentAmount(
        paymentResponseHBL.invoiceNo,
        paymentResponseHBL.Amount,
      );

      if (!isAmountValid) {
        // Update the invoice status
        await getRepository(Invoice)
          .createQueryBuilder('Invoice')
          .update(Invoice)
          .set({
            invoice_status: InvoiceStatus.InReview,
            buyer_remarks: `Transaction is completed. However, some of the parameters have been changed during the trasanction process.`,
          })
          .where('id = :id', { id: paymentResponseHBL.userDefined2 })
          .execute();

        console.log(
          'Payment failed! Seems like the amount or paycurrency has been tweaked!',
        );
        return {
          success: false,
          message:
            'Payment failed! Seems like the amount or paycurrency has been tweaked!',
        };
      }

      const invoiceDetails = await this.invoiceRepository.findOneOrFail({
        where: {
          id: paymentResponseHBL.userDefined2,
        },
        relations: ['lead', 'subscription', 'invoice_to', 'invoice_from'],
      });

      // post payment for leads
      if (invoiceDetails.invoice_for === InvoiceType.Leads) {
        // Update the invoice status
        await getRepository(Invoice)
          .createQueryBuilder('Invoice')
          .update(Invoice)
          .set({
            invoice_status: InvoiceStatus.InEscrow,
            provider_remarks:
              'Payment has been received from buyer and is now waiting for admin approval!',
            buyer_remarks:
              'Invoice has been paid and is now waiting for admin approval!',
          })
          .where('id = :id', { id: paymentResponseHBL.userDefined2 })
          .execute();

        // sending the provider notification that their invoice status has been updated
        const message = `Inovice status for invoice #${invoiceDetails.invoice_number} has been updated! Please check remarks for the invoice!`;
        const notification = await this.notificationService.saveNotification(
          invoiceDetails.invoice_from.id,
          message,
        );
        this.socketService.server
          .to(invoiceDetails.invoice_from.id)
          .emit('Notification', notification);

        return await this.handleLeadPaymentResponse(
          paymentResponseHBL.userDefined2,
          Number(invoiceDetails?.initiated_invoice_amount),
          invoiceDetails.lead.id,
        );
      }

      // post payment for subscription
      if (invoiceDetails.invoice_for === InvoiceType.Subscription) {
        // Update the invoice status
        await getRepository(Invoice)
          .createQueryBuilder('Invoice')
          .update(Invoice)
          .set({
            invoice_status: InvoiceStatus.Paid,
          })
          .where('id = :id', { id: paymentResponseHBL.userDefined2 })
          .execute();

        return await this.handleSubscriptionPaymentResponse(
          invoiceDetails.subscription.id,
          invoiceDetails.invoice_to.id,
        );
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Unable to perform post payment subscription actions!',
      };
    }
  }

  async handleLeadPaymentResponse(invoiceId: string, amount, leadId: string) {
    try {
      // TODO: Update partionAmount in lead
      await this.leadService.updatePartialPayment(leadId, amount);

      //Get data for synergy invoice
      let queryInvoiceData: Invoice | any = await getRepository(Invoice)
        .createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.lead', 'lead')
        .leftJoinAndSelect('invoice.invoice_to', 'buyer')
        .leftJoinAndMapOne(
          'invoice.profile',
          Profile,
          'buyerProfile',
          'invoice.invoice_to = buyerProfile.user',
        )
        .leftJoinAndMapOne(
          'invoice.organization',
          Organization,
          'organization',
          'invoice.invoice_to = organization.admin',
        )
        .where('invoice.id=:id', { id: invoiceId })
        .getOne();

      let invoiceData: SynergyInvoice;
      //console.log(queryInvoiceData);

      //TODO: Proceed for the synergy invoice generation
      if (queryInvoiceData.invoice_to.profileType === 'Organization') {
        invoiceData = {
          ManualNo: queryInvoiceData.invoice_number,
          CustomerId: queryInvoiceData.invoice_to.reference_number,
          CustomerName: queryInvoiceData.organization.name,
          SalesInvoiceLines: [
            {
              ItemId: queryInvoiceData.lead.reference_number,
              ItemName: queryInvoiceData.invoice_item.description,
              Quantity: queryInvoiceData.invoice_item.quantity,
              UnitPrice: queryInvoiceData.invoice_item.rate,
              TotalPrice: queryInvoiceData.invoice_item.line_total,
            },
          ],
          Charges: queryInvoiceData.invoice_charges.map((invoiceChargeInfo) => {
            return {
              ChargeType: invoiceChargeInfo.name,
              ChargeAmount: invoiceChargeInfo.amount,
            };
          }),
          CustomeAddress: queryInvoiceData?.organization.officeAddress1,
          CustomerPhone: queryInvoiceData?.organization?.officeContactNumber,
          CustomerEmail: queryInvoiceData.invoice_to.email,
          CustomerPanPANNo: queryInvoiceData?.organization.vatOrPan,
          PaymentMode: 'Web',
        };
        this.generateSyneryInvoice(invoiceData);
        console.log(invoiceData);
      }

      if (queryInvoiceData.invoice_to.profileType === 'Individual') {
        invoiceData = {
          ManualNo: queryInvoiceData.invoice_number,
          CustomerId: queryInvoiceData.invoice_to.reference_number,
          CustomerName:
            queryInvoiceData?.invoice_to.firstName +
            ' ' +
            queryInvoiceData.invoice_to.lastName,
          SalesInvoiceLines: [
            {
              ItemId: queryInvoiceData.lead.reference_number,
              ItemName: queryInvoiceData.invoice_item.description,
              Quantity: queryInvoiceData.invoice_item.quantity,
              UnitPrice: queryInvoiceData.invoice_item.rate,
              TotalPrice: queryInvoiceData.invoice_item.line_total,
            },
          ],
          Charges: queryInvoiceData.invoice_charges.map((invoiceChargeInfo) => {
            return {
              ChargeType: invoiceChargeInfo.name,
              ChargeAmount: invoiceChargeInfo.amount,
            };
          }),
          CustomeAddress: queryInvoiceData.profile?.address1,
          CustomerPhone: queryInvoiceData?.profile?.mobile,
          CustomerEmail: queryInvoiceData?.invoice_to?.email,
          CustomerPanPANNo: queryInvoiceData?.invoice_to?.identityNumber,
          PaymentMode: 'Web',
        };
        this.generateSyneryInvoice(invoiceData);
        console.log(invoiceData);
      }

      return {
        success: true,
        message:
          'Successfully updated invoice status, lead partial amount, final invoice link and sent email!',
      };
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async handleSubscriptionPaymentResponse(subscriptionId, currentUserId) {
    // Get previous subscription
    const addToSubscriptionHistory =
      await this.userSubscriptionRepository.findOne({
        where: { user: currentUserId },
      });

    // Get Invoice Id
    const getInvoiceForSynergy = await this.invoiceRepository.findOne({
      where: {
        invoice_to: currentUserId,
        subscription: subscriptionId,
      },
    });

    // Move to subscription history
    await getRepository(UserSubscriptionHistory)
      .createQueryBuilder('UserSubscriptionHistory')
      .insert()
      .values({
        renewed_at: addToSubscriptionHistory.renewed_at,
        expires_at: addToSubscriptionHistory.expires_at,
        status: addToSubscriptionHistory.status,
        createdAt: addToSubscriptionHistory.createdAt,
        updatedAt: addToSubscriptionHistory.updatedAt,
        user: addToSubscriptionHistory.user.id,
        subscription: addToSubscriptionHistory.subscription.id,
      })
      .execute();

    // Get new subscription data
    const newSubscriptionData = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      select: ['duration'],
    });

    // Renew subscription data to subscription
    await getRepository(UserSubscription)
      .createQueryBuilder('UserSubscription')
      .update({
        status: SubscriptionStatus.active,
        expires_at: addMonths(new Date(), newSubscriptionData.duration),
        renewed_at: new Date(Date.now()),
        subscription: subscriptionId,
      })
      .where({
        user: currentUserId,
      })
      .execute();

    // Get data for synergy invoice
    let queryInvoiceData: Invoice | any = await getRepository(Invoice)
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.subscription', 'subscription')
      .leftJoinAndSelect('invoice.invoice_to', 'buyer')
      .leftJoinAndMapOne(
        'invoice.profile',
        Profile,
        'buyerProfile',
        'invoice.invoice_to = buyerProfile.user',
      )
      .leftJoinAndMapOne(
        'invoice.organization',
        Organization,
        'organization',
        'invoice.invoice_to = organization.admin',
      )
      .where('invoice.id=:id', { id: getInvoiceForSynergy.id })
      .getOne();

    let invoiceData: SynergyInvoice;

    // TODO: Proceed for the synergy invoice generation
    if (queryInvoiceData.invoice_to.profileType === 'Organization') {
      invoiceData = {
        ManualNo: queryInvoiceData.invoice_number,
        CustomerId: queryInvoiceData.invoice_to.reference_number,
        CustomerName: queryInvoiceData.organization.name,
        SalesInvoiceLines: [
          {
            ItemId: '1',
            ItemName: queryInvoiceData.invoice_item.description,
            Quantity: queryInvoiceData.invoice_item.quantity,
            UnitPrice: queryInvoiceData.invoice_item.rate,
            TotalPrice: queryInvoiceData.invoice_item.line_total,
          },
        ],
        Charges: queryInvoiceData.invoice_charges.map((invoiceChargeInfo) => {
          return {
            ChargeType: invoiceChargeInfo.name,
            ChargeAmount: invoiceChargeInfo.amount,
          };
        }),
        CustomeAddress: queryInvoiceData?.organization.officeAddress1,
        CustomerPhone: queryInvoiceData?.organization?.officeContactNumber,
        CustomerEmail: queryInvoiceData.invoice_to.email,
        CustomerPanPANNo: queryInvoiceData?.organization.vatOrPan,
        PaymentMode: 'Web',
      };
      this.generateSyneryInvoice(invoiceData);
    }

    if (queryInvoiceData.invoice_to.profileType === 'Individual') {
      invoiceData = {
        ManualNo: queryInvoiceData.invoice_number,
        CustomerId: queryInvoiceData.invoice_to.reference_number,
        CustomerName:
          queryInvoiceData?.invoice_to.firstName +
          ' ' +
          queryInvoiceData.invoice_to.lastName,
        SalesInvoiceLines: [
          {
            ItemId: '1',
            ItemName: queryInvoiceData.invoice_item.description,
            Quantity: queryInvoiceData.invoice_item.quantity,
            UnitPrice: queryInvoiceData.invoice_item.rate,
            TotalPrice: queryInvoiceData.invoice_item.line_total,
          },
        ],
        Charges: queryInvoiceData.invoice_charges.map((invoiceChargeInfo) => {
          return {
            ChargeType: invoiceChargeInfo.name,
            ChargeAmount: invoiceChargeInfo.amount,
          };
        }),
        CustomeAddress: queryInvoiceData.profile?.address1,
        CustomerPhone: queryInvoiceData?.profile?.mobile,
        CustomerEmail: queryInvoiceData?.invoice_to?.email,
        CustomerPanPANNo: queryInvoiceData?.invoice_to?.identityNumber,
        PaymentMode: 'Web',
      };
      this.generateSyneryInvoice(invoiceData);
    }
    console.log('Subscription has been successfully renewed!');
    return {
      success: true,
      message: 'Subscription has been successfully renewed!',
    };
  }

  async generateSyneryInvoice(invoiceData: SynergyInvoice) {
    try {
      const authCreds = await this.getAccessToken();
      const accessToken =
        authCreds.data && authCreds.data.userData
          ? authCreds.data.userData.Token
          : '';

      const headersRequest = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      const createSynergyInvoiceResponse = await this.httpService
        .post(
          process.env.SYNERGY_URL + '/api/Voucher/CustomSalesInvoice',
          invoiceData,
          { headers: headersRequest },
        )
        .toPromise();
      if (
        createSynergyInvoiceResponse.data &&
        createSynergyInvoiceResponse.data.StatusCode === 200
      ) {
        const updateFinalInvoiceLink = await getRepository(Invoice)
          .createQueryBuilder('invoice')
          .update(Invoice)
          .set({
            final_invoice_link: `http://${createSynergyInvoiceResponse.data.InvoiceUrl}`,
          })
          .where('invoice.invoice_number = :invoice_number', {
            invoice_number: invoiceData.ManualNo,
          })
          .execute();

        if (updateFinalInvoiceLink && updateFinalInvoiceLink.affected === 1) {
          // Testing: Email buyer with synergy invoice.
          sendEmail({
            emailType: 'generate_synergy_invoice',
            email: invoiceData.CustomerEmail,
            messageBody: {
              name: invoiceData.CustomerName,
              invoiceNumber: invoiceData.ManualNo,
              invoiceURL:
                'http://' + createSynergyInvoiceResponse.data.InvoiceUrl,
            },
          });

          console.log('Invoice generated and mail sent successfully!');
          return {
            success: true,
          };
        } else {
          console.log(
            'Invoice generated but problem in updating final invoice link!',
          );
          return {
            success: false,
          };
        }
      } else {
        console.log('Problem in synergy invoice generation!');

        return {
          success: false,
        };
      }
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async getAccessToken() {
    try {
      const headersRequest = {
        'Content-Type': 'application/json',
      };
      return this.httpService
        .post(
          process.env.SYNERGY_URL +
            `/api/account/authenticate?username=${process.env.SYNERGY_USERNAME}&password=${process.env.SYNERGY_PASSWORD}`,
          { headers: headersRequest },
        )
        .toPromise();
    } catch (error) {
      console.log('Problem in fetching synergy creds!');
      console.log(error);
      return error;
    }
  }

  async checkPaymentAmount(
    invoice_number: string,
    hblPaidAmount: string,
  ): Promise<boolean> {
    const invoiceDetails = await this.invoiceRepository.findOne({
      where: { invoice_number },
      select: ['final_invoice_amount', 'invoice_item'],
    });

    let convertedHBLAmount = Number(hblPaidAmount) / 100; // converting into rupees
    if (convertedHBLAmount < Number(invoiceDetails.final_invoice_amount)) {
      return false;
    }
    return true;
  }

  // async pushSynergyInvoiceDataToSQS(invoiceData: SynergyInvoice) {
  //   const SQSConfig = {
  //     apiversion: process.env.AWS_SES_API_VERSION,
  //     accessKeyId: process.env.SQS_EMAIL_SERVICE_ACCESS_KEY,
  //     secretAccessKey: process.env.SQS_EMAIL_SERVICE_SECRET_ACCESS_KEY,
  //     region: process.env.AWS_REGION_SYNERGY,
  //   };

  //   let sqs = new AWS.SQS(SQSConfig);

  //   let params = {
  //     MessageBody: JSON.stringify(invoiceData),
  //     QueueUrl: process.env.SQS_QUEUE_URL_SYNERGY,
  //   };
  //   try {
  //     let sqsResponse = await sqs.sendMessage(params).promise();
  //     console.log(sqsResponse);
  //     return sqsResponse;
  //   } catch (error) {
  //     return error;
  //   }
  // }
}
