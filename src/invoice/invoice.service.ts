import { ProviderPaymentDetails } from './../profile/entities/providerPaymentDetails.entity';
import { CURRENCY_CODES } from './../payment/dto/payment.dto';
import { PaymentService } from '../payment/payment.service';
import { EMAIL_TYPE } from './../user/type/emailType';
import { Lead } from './../lead/entities/lead.entity';
import { User } from './../user/entities/user.entity';
import { Subscription } from './../subscription/entities/subscription.entity';
import { UserSubscriptionService } from './../user-subscription/user-subscription.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import {
  InvoiceStatus,
  InvoiceType,
  INVOICE_ITEM_TYPE,
  INVOICE_TYPE,
} from './type/invoice';
import {
  HttpException,
  Injectable,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection, getRepository } from 'typeorm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { calculateFinalInvoiceAmount } from './utils/calcInvoiceAmount';
import { createInvoice } from './utils/createInvoice';
import { Profile } from 'src/profile/entities/profile.entity';
import { LeadProvider } from 'src/lead/entities/leadProvider.entity';
import { downloadInvoice } from './utils/uploadInvoiceS3';
import * as fs from 'fs';
import { sendEmail } from 'src/user/util/sendEmail';
import { SocketGateway } from 'src/websocket/websocket.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { payTypeEnum } from 'src/lead/types/payType';
import { nanoid } from 'nanoid';
import { customAlphabet } from 'nanoid/async';
@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,

    @InjectRepository(LeadProvider)
    private leadProviderRepository: Repository<LeadProvider>,

    @InjectRepository(ProviderPaymentDetails)
    private providerPaymentDetails: Repository<ProviderPaymentDetails>,

    private subscriptionService: SubscriptionService,
    private userSubscriptionService: UserSubscriptionService,
    private readonly socketService: SocketGateway,
    private readonly notificationService: NotificationService,
    private paymentService: PaymentService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, currentUserId: string) {
    try {
      let providerUserDetails: User;
      let buyerUserDetails: User;
      let invoice_to: string;
      let invoice_from: string;

      let { invoice_for } = createInvoiceDto;
      let invoice = new Invoice();

      if (invoice_for == InvoiceType.Leads) {
        invoice_to = createInvoiceDto.invoice_to;
        invoice.invoice_to = await this.userRepository.findOne(invoice_to);
        invoice.invoice_from = await this.userRepository.findOne(currentUserId);

        // check if provider has at least one primary account details
        const providerPaymentAccountDetails =
          await this.providerPaymentDetails.findOne({
            where: {
              user: currentUserId,
              isPrimary: true,
            },
          });

        if (!providerPaymentAccountDetails) {
          return {
            success: false,
            message:
              'Please update your profile with bank account details before proceeding with payment request!',
          };
        }

        //  get user details for invoice user information
        providerUserDetails = await this.userRepository.findOne({
          where: {
            id: currentUserId,
          },
          relations: ['profile', 'organization'],
        });

        if (
          (providerUserDetails.profileType == 'Individual' &&
            !providerUserDetails.identityNumber) ||
          providerUserDetails.identityNumber == 'N/A' ||
          (providerUserDetails.profileType == 'Organization' &&
            !providerUserDetails.organization.vatOrPan)
        ) {
          return {
            success: false,
            message:
              'Please update your profile with your PAN/VAT details before proceeding with payment request!',
          };
        }

        //  get buyer details for invoice user information
        buyerUserDetails = await this.userRepository.findOne({
          where: {
            id: invoice_to,
          },
          relations: ['profile', 'organization'],
        });

        // check if input payload has lead id
        if (!createInvoiceDto.lead_id) {
          return {
            sucess: false,
            error: 'Invalid lead id!',
          };
        }
        invoice.invoice_for = InvoiceType.Leads;

        /**
         * Testing: Get payment details from invoice_from
         * 1. Get subscription_id using invoice_from from user_subscription
         * 3. With that subscription_id get service_charge, tds, commission from subscription_feature
         * */

        // get tds, commssion, service_for buyer to include invoice charges
        let subscriptionDetails =
          await this.userSubscriptionService.getSubscriptionByUserId(
            invoice_to,
          );
        const subscriptionId = subscriptionDetails?.subscription?.id;
        if (!(subscriptionDetails && subscriptionId)) {
          return {
            sucess: false,
            error: `The user with id ${invoice_to} has no subscriptions!`,
          };
        }
        let paymentDetails: Array<any> =
          await this.subscriptionService.getPaymentServiceDetailsBy(
            subscriptionDetails.subscription.id,
          );
        let filterObject = {};
        paymentDetails.map((paymentDetail) => {
          filterObject[paymentDetail.key] = paymentDetail.value;
        });

        let leadId: any = createInvoiceDto.lead_id;
        let leadWorkHour: number;

        // Testing: check if the lead belongs to the requested user
        let lead: Lead = await this.leadRepository.findOne(leadId);
        let leadProvider = await this.leadProviderRepository.findOne({
          where: {
            lead: leadId,
          },
          relations: ['provider'],
        });
        // console.log(leadProvider);
        if (!leadProvider || currentUserId !== leadProvider.provider.id) {
          return {
            success: false,
            error: 'User is not authorized to generate invoice for this lead!',
          };
        }
        invoice.lead = lead;

        if (!lead) {
          return {
            success: false,
            error: `No lead exists with id ${leadId}`,
          };
        }

        // generate invoice number dynamically
        invoice.invoice_number = await this.generateInvoiceNumber(
          InvoiceType.Leads,
        );

        // calculate invoice item amount
        let leadDetails: INVOICE_ITEM_TYPE;
        leadWorkHour =
          lead.payType == payTypeEnum.Hourly
            ? Number(createInvoiceDto.work_hour || 1)
            : 1;
        if (lead.payType == payTypeEnum.Hourly) {
          leadDetails = {
            description: lead.lead_title,
            rate: Number(lead.payRate),
            payCurrency: lead.payCurrency,
            quantity: leadWorkHour,
            line_total: Number(lead.payRate * leadWorkHour),
          };
        }

        if (
          createInvoiceDto.request_invoice_amount &&
          lead.payType == payTypeEnum.Bulk
        ) {
          // const amountCanBeRequested = lead.payRate - lead.partialPayment;
          if (!createInvoiceDto.request_invoice_amount) {
            return {
              success: false,
              message:
                'Request invoice amount is required if lead is of type bulk!',
            };
          }
          // Not Required: As per new requirement, user can request any amount of invoice amount.
          // if (createInvoiceDto.request_invoice_amount > amountCanBeRequested) {
          //   return {
          //     success: false,
          //     message: "Requested amount can't be greater than the lead's total amount!"
          //   }
          // }

          leadDetails = {
            description: lead.lead_title,
            rate: Number(createInvoiceDto.request_invoice_amount),
            payCurrency: lead.payCurrency,
            quantity: 1,
            line_total: Number(
              createInvoiceDto.request_invoice_amount.toFixed(2),
            ),
          };
        }

        invoice.invoice_item = { ...leadDetails };
        invoice.initiated_invoice_amount = leadDetails.line_total; // since now we have only 1 item
        invoice.final_invoice_amount = await (
          await calculateFinalInvoiceAmount(
            leadDetails.line_total,
            filterObject,
          )
        ).total_amount;
        invoice.invoice_charges = await (
          await calculateFinalInvoiceAmount(
            leadDetails.line_total,
            filterObject,
          )
        ).invoice_charges;
        invoice.created_date = new Date(Date.now());
        invoice.due_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        invoice.invoice_status = InvoiceStatus.Raised;
        invoice.provider_remarks =
          "Your invoice has been successfully requested! We'll let you know once your buyer approves for the payment!";
      }

      if (invoice_for == InvoiceType.Subscription) {
        // generates invoice number
        invoice.invoice_number = await this.generateInvoiceNumber(
          InvoiceType.Subscription,
        );

        //  get user details for invoice user information
        const billingAccount = await this.userRepository.findOne({
          where: {
            email: process.env.SUBSCRIPTION_BILLING_EMAIL,
          },
        });
        console.log(billingAccount);
        if (!billingAccount) {
          return {
            success: false,
            message: 'No subscription billing account found!',
          };
        }

        invoice.invoice_to = await this.userRepository.findOne(currentUserId);
        invoice.invoice_from = await this.userRepository.findOne(
          billingAccount,
        );

        // check if subscription id exisits
        if (!createInvoiceDto.subscription_id) {
          return {
            sucess: false,
            error: 'Invalid subscription id!',
          };
        }
        invoice.invoice_for = InvoiceType.Subscription;

        const subscriptionDetails: Subscription = await (
          await this.subscriptionService.findOne(
            createInvoiceDto.subscription_id,
          )
        ).data;
        if (!subscriptionDetails) {
          return {
            success: false,
            error: 'Invalid subscription id!',
          };
        }
        invoice.subscription = subscriptionDetails;

        let subscriptionItem: INVOICE_ITEM_TYPE = {
          description: 'Subscription: ' + subscriptionDetails.type,
          rate: subscriptionDetails.amount,
          payCurrency: 'USD',
          quantity: 1,
          line_total: Number((subscriptionDetails.amount * 1).toFixed(2)),
        };
        invoice.invoice_charges = [
          {
            name: 'tds',
            value: 0,
            valueType: 'percent',
            amount: 0,
          },
          {
            name: 'service_charge',
            value: 0,
            valueType: 'percent',
            amount: 0,
          },
          {
            name: 'commission',
            value: 0,
            valueType: 'percent',
            amount: 0,
          },
        ];
        invoice.invoice_item = { ...subscriptionItem };
        invoice.initiated_invoice_amount = subscriptionItem.line_total; // since now we have only 1 item
        invoice.final_invoice_amount = subscriptionItem.line_total;

        invoice.created_date = new Date(Date.now());
        invoice.due_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        invoice.invoice_status = InvoiceStatus.Raised;

        //Removes previous raised invoices before creating new one
        await getRepository(Invoice)
          .createQueryBuilder('Invoice')
          .delete()
          .where({
            invoice_to: currentUserId,
            invoice_status: InvoiceStatus.Raised,
            invoice_for: InvoiceType.Subscription,
          })
          .execute();
      }
      // saves invoice, generates invoice pdf, upload to S3 and updates the invoice link
      const createInvoiceReponse = await this.invoiceRepository.save(invoice);
      console.log(createInvoiceReponse);
      if (createInvoiceReponse && invoice.invoice_for === InvoiceType.Leads) {
        // generates and uploads buyer invoice in case of Leads
        let saveBuyerInvoice = await createInvoice(
          invoice,
          providerUserDetails,
          buyerUserDetails,
          `${createInvoiceReponse.invoice_number}${nanoid(16)}.pdf`,
          true,
          `Requested Proforma Invoice/Payment`,
        );
        await this.invoiceRepository.update(createInvoiceReponse.id, {
          initial_buyer_invoice_link: saveBuyerInvoice.Key,
        });

        // generates and uploads user invoice in case of Leads
        let saveProviderInvoice = await createInvoice(
          invoice,
          providerUserDetails,
          buyerUserDetails,
          `${createInvoiceReponse.invoice_number}${nanoid(16)}.pdf`,
          false,
          `Payment request order`,
        );
        await this.invoiceRepository.update(createInvoiceReponse.id, {
          initial_invoice_link: saveProviderInvoice.Key,
        });

        let buyerInvoiceURL = await downloadInvoice(saveBuyerInvoice.Key);
        let providerInvoiceURL = await downloadInvoice(saveProviderInvoice.Key);

        // send email to buyer
        sendEmail({
          emailType: 'generate_buyer_invoice',
          email: createInvoiceReponse.invoice_to.email,
          messageBody: {
            firstName: createInvoiceReponse.invoice_to.firstName,
            lastName: createInvoiceReponse.invoice_to.lastName,
            invoiceNumber: createInvoiceReponse.invoice_number,
            invoiceURL: buyerInvoiceURL,
          },
        });

        // send email to provider
        sendEmail({
          emailType: 'generate_provider_invoice',
          email: createInvoiceReponse.invoice_from.email,
          messageBody: {
            firstName: createInvoiceReponse.invoice_from.firstName,
            lastName: createInvoiceReponse.invoice_from.lastName,
            invoiceNumber: createInvoiceReponse.invoice_number,
            invoiceURL: providerInvoiceURL,
          },
        });

        // sending the buyer notification that they have pending invoice to approve
        const message = `You have pending invoice #${createInvoiceReponse.invoice_number} to be approved requested by ${createInvoiceReponse.invoice_from.firstName} ${createInvoiceReponse.invoice_from.lastName}!`;
        const notification = await this.notificationService.saveNotification(
          createInvoiceReponse.invoice_to.id,
          message,
        );
        this.socketService.server
          .to(createInvoiceReponse.invoice_to.id)
          .emit('Notification', notification);
      }

      if (
        createInvoiceReponse &&
        invoice.invoice_for === InvoiceType.Subscription
      ) {
        const hashData = await this.paymentService.generateHash({
          invoiceNo: createInvoiceReponse.invoice_number,
          amount: createInvoiceReponse.final_invoice_amount,
          currencyCode:
            createInvoiceReponse.invoice_item.payCurrency == 'USD'
              ? '840'
              : '524',
        });

        return {
          success: true,
          error: null,
          data: {
            userDefined1: createInvoiceReponse.invoice_for,
            userDefined2: createInvoiceReponse.id,
            invoiceNo: createInvoiceReponse.invoice_number,
            currencyCode:
              createInvoiceReponse.invoice_item.payCurrency == 'USD'
                ? '840'
                : '524',
            amount: createInvoiceReponse.final_invoice_amount,
            nonSecure: 'N',
            paymentGatewayID: hashData.data.merchantKey,
            hashValue: hashData.data.hashValue,
            productDesc: createInvoiceReponse.invoice_item.description,
            userDefined3: createInvoiceReponse.invoice_item.payCurrency,
          },
        };
      }
      return {
        success: true,
        error: null,
        data: createInvoiceReponse,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in generating invoice!',
      };
    }
  }

  async downloadPerformaInvoice(id: string) {
    if (!id) {
      return {
        success: false,
        error: 'Invalid invoice id!',
      };
    }
    try {
      let invoiceData = await this.invoiceRepository.findOne({
        where: {
          id: id,
        },
        select: ['initial_invoice_link'],
      });
      if (invoiceData) {
        let signedInvoiceUrl = await downloadInvoice(
          invoiceData.initial_invoice_link,
        );
        return {
          success: true,
          data: signedInvoiceUrl,
        };
      } else {
        return {
          success: false,
          error: 'No invoice exists for given id!',
        };
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in downloading invoice!',
      };
    }
  }

  async downloadBuyerPerformaInvoice(id: string) {
    if (!id) {
      return {
        success: false,
        error: 'Invalid invoice id!',
      };
    }
    try {
      let invoiceData = await this.invoiceRepository.findOne({
        where: {
          id: id,
        },
        select: ['initial_buyer_invoice_link', 'final_invoice_link'],
      });

      if (invoiceData.final_invoice_link) {
        return {
          success: true,
          data: invoiceData.final_invoice_link,
        };
      } else {
        let signedInvoiceUrl = await downloadInvoice(
          invoiceData.initial_buyer_invoice_link,
        );
        return {
          success: true,
          data: signedInvoiceUrl,
        };
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in downloading invoice!',
      };
    }
  }

  async getProviderLeadInvoices(
    providerId: string,
    leadId: string,
    dateFrom?: string,
    dateTo?: string,
    invoiceNo?: string,
    status?: InvoiceStatus,
    pages?: string,
    size?: string,
  ) {
    if (!(providerId && leadId)) {
      return {
        success: false,
        message:
          'Please provide valid values for provider and lead to fetch the invoices!',
      };
    }

    try {
      const PAGE_SIZE = parseInt(size || '50');
      const page = parseInt(pages || '0');

      let transactionsInvoices = getRepository(Invoice)
        .createQueryBuilder('invoice')
        .select([
          'invoice.id',
          'invoice.invoice_for',
          'invoice.invoice_from',
          'invoice.invoice_item',
          'invoice.invoice_number',
          'invoice.lead',
          'invoice.initiated_invoice_amount',
          'invoice.created_date',
          'invoice.due_date',
          'invoice.invoice_status',
          'invoice.provider_remarks',
        ])
        .leftJoinAndSelect('invoice.lead', 'lead')
        .where('invoice.invoice_for = :invoice_for', {
          invoice_for: InvoiceType.Leads,
        })
        .andWhere('invoice.invoice_from = :invoice_from', {
          invoice_from: providerId,
        })
        .andWhere('invoice.lead = :leadId', { leadId: leadId });

      if (dateFrom && dateTo) {
        transactionsInvoices
          .andWhere('invoice.created_date >= :dateFrom', { dateFrom: dateFrom })
          .andWhere('invoice.created_date <= :dateTo', { dateTo: dateTo });
      }

      if (invoiceNo) {
        transactionsInvoices.andWhere('invoice.invoice_number = :invoiceNo', {
          invoiceNo: invoiceNo,
        });
      }

      if (status) {
        transactionsInvoices.andWhere(
          'invoice.invoice_status = :filterStatus',
          { filterStatus: status },
        );
      }

      const providerLeadInvoicesLength = await transactionsInvoices
        .orderBy('invoice.created_date', 'DESC')
        .getCount();

      const providerLeadInvoices = await transactionsInvoices
        .orderBy('invoice.created_date', 'DESC')
        .take(PAGE_SIZE)
        .skip(PAGE_SIZE * page)
        .getMany();

      return {
        success: true,
        message: 'Invoices fetched successfully!',
        pagination: {
          page: page,
          size: PAGE_SIZE,
          count: providerLeadInvoicesLength,
        },
        data: providerLeadInvoices,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in fetching invoices for given provider!',
      };
    }
  }

  async getBuyerLeadRaisedInvoices(
    buyerId: string,
    leadId?: string,
    dateFrom?: string,
    dateTo?: string,
    invoiceNo?: string,
    pages?: string,
    size?: string,
  ) {
    if (!buyerId) {
      return {
        success: false,
        message: 'Please provide valid values to fetch the invoices!',
      };
    }
    try {
      const PAGE_SIZE = parseInt(size || '50');
      const page = parseInt(pages || '0');

      let transactionsInvoices = getRepository(Invoice)
        .createQueryBuilder('invoice')
        .select([
          'invoice.id',
          'invoice.invoice_number',
          'invoice.invoice_for',
          'invoice.invoice_to',
          'invoice.invoice_item',
          'invoice.lead',
          'invoice.invoice_charges',
          'invoice.final_invoice_amount',
          'invoice.created_date',
          'invoice.due_date',
          'invoice.invoice_status',
          'invoice.buyer_remarks',
        ])
        .leftJoinAndSelect('invoice.lead', 'lead')
        .where('invoice.invoice_for = :invoice_for', {
          invoice_for: InvoiceType.Leads,
        })
        .andWhere('invoice.invoice_to = :invoice_to', { invoice_to: buyerId })
        .andWhere('invoice.invoice_status = :status', {
          status: InvoiceStatus.Raised,
        });

      if (leadId) {
        transactionsInvoices.andWhere('invoice.lead = :leadId', {
          leadId: leadId,
        });
      }

      if (dateFrom && dateTo) {
        transactionsInvoices
          .andWhere('invoice.created_date >= :dateFrom', { dateFrom: dateFrom })
          .andWhere('invoice.created_date <= :dateTo', { dateTo: dateTo });
      }

      if (invoiceNo) {
        transactionsInvoices.andWhere('invoice.invoice_number = :invoiceNo', {
          invoiceNo: invoiceNo,
        });
      }

      const pendingInvoicesLength = await transactionsInvoices
        .orderBy('invoice.created_date', 'DESC')
        .getCount();

      const pendingInvoices = await transactionsInvoices
        .orderBy('invoice.created_date', 'DESC')
        .take(PAGE_SIZE)
        .skip(PAGE_SIZE * page)
        .getMany();

      return {
        success: true,
        message: 'Invoices fetched successfully!',
        pagination: {
          page: page,
          size: PAGE_SIZE,
          count: pendingInvoicesLength,
        },
        data: pendingInvoices,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error:
          'Problem in fetching invoices. Please apply the correct filter and try again!',
      };
    }
  }

  async getBuyerLeadTransactionInvoices(
    buyerId: string,
    leadId?: string,
    dateFrom?: string,
    dateTo?: string,
    invoiceNo?: string,
    status?: InvoiceStatus,
    pages?: string,
    size?: string,
  ) {
    if (!buyerId) {
      return {
        success: false,
        message: 'Please provide valid values to fetch the invoices!',
      };
    }

    try {
      const PAGE_SIZE = parseInt(size || '50');
      const page = parseInt(pages || '0');

      let transactionsInvoices = getRepository(Invoice)
        .createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.lead', 'lead')
        // .where('invoice.invoice_for = :invoice_for', {
        //   invoice_for: InvoiceType.Leads,
        // })
        .andWhere('invoice.invoice_to = :invoice_to', { invoice_to: buyerId })
        .andWhere('invoice.invoice_status != :status', {
          status: InvoiceStatus.Raised,
        });

      if (leadId) {
        transactionsInvoices.andWhere('invoice.lead = :leadId', {
          leadId: leadId,
        });
      }

      if (dateFrom && dateTo) {
        transactionsInvoices
          .andWhere('invoice.created_date >= :dateFrom', { dateFrom: dateFrom })
          .andWhere('invoice.created_date <= :dateTo', { dateTo: dateTo });
      }

      if (invoiceNo) {
        transactionsInvoices.andWhere('invoice.invoice_number = :invoiceNo', {
          invoiceNo: invoiceNo,
        });
      }

      if (status) {
        transactionsInvoices.andWhere(
          'invoice.invoice_status = :filterStatus',
          { filterStatus: status },
        );
      }

      const transInvoicesLength = await transactionsInvoices
        .orderBy('invoice.created_date', 'DESC')
        .getCount();

      const transInvoices = await transactionsInvoices
        .orderBy('invoice.created_date', 'DESC')
        .take(PAGE_SIZE)
        .skip(PAGE_SIZE * page)
        .getMany();

      return {
        success: true,
        message: 'Invoices fetched successfully!',
        pagination: {
          page: page,
          size: PAGE_SIZE,
          count: transInvoicesLength,
        },
        data: transInvoices,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error:
          'Problem in fetching invoices. Please apply the correct filter and try again!',
      };
    }
  }

  async getUserSubscriptionInvoices(userId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'Invalid user id!',
        };
      }

      let buyerInvoices = await this.invoiceRepository.find({
        where: {
          invoice_for: InvoiceType.Subscription,
          invoice_to: userId,
        },
        select: [
          'invoice_number',
          'invoice_for',
          'invoice_to',
          'invoice_item',
          'lead',
          'invoice_charges',
          'final_invoice_amount',
          'created_date',
          'due_date',
          'invoice_status',
        ],
        order: {
          createdAt: 'DESC',
        },
      });

      return {
        success: true,
        message: 'Invoices fetched successfully!',
        data: buyerInvoices,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in fetching invoices for given user!',
      };
    }
  }

  async findAll() {
    try {
      const invoices = await this.invoiceRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });
      return {
        success: true,
        error: null,
        data: invoices,
      };
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  async findOne(id: string) {
    try {
      const invoice = await this.invoiceRepository.findOne(id);
      if (!invoice) {
        return {
          success: false,
          error: 'No invoice with given id exists!',
        };
      }
      return {
        success: true,
        error: null,
        data: invoice,
      };
    } catch (error) {
      console.log(error);
      return 'Problem in fetching invoice!';
    }
  }

  update(id: number, updateInvoiceDto: UpdateInvoiceDto) {
    return `This action updates a #${id} invoice`;
  }

  remove(id: number) {
    return `This action removes a #${id} invoice`;
  }

  async generateInvoiceNumber(invoiceType: INVOICE_TYPE): Promise<string> {
    const nanoid = customAlphabet('93072614', 5);
    let randString = await nanoid(); // generate numeric random number of 5 digit
    //let dateString = Date.now().toString(); // date time string
    let randomInvoiceNumber: string;
    if (invoiceType === InvoiceType.Leads) {
      randomInvoiceNumber = String().concat('LI-', randString);
    } else if (invoiceType === InvoiceType.Subscription) {
      randomInvoiceNumber = String().concat('SI-', randString);
    }
    return randomInvoiceNumber;
  }
}
