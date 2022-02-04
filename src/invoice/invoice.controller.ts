import { InvoiceStatus } from 'src/invoice/type/invoice';
import { RolesGuard } from './../auth/roles.guard';
import { JwtAuthGuard } from './../auth/jwt-auth.guard';
import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Header, UseGuards, Req } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Query } from '@nestjs/common';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/type/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) { }

  @Post('create')
  create(@Body() createInvoiceDto: CreateInvoiceDto, @Req() req: any) {
    const currentUserId: string = req?.user?.id;
    return this.invoiceService.create(createInvoiceDto, currentUserId);
  }

  @Get('list-status')
  async listInvoices() {
    return [
      {
        "status_key": "Raised",
        "status_value": InvoiceStatus.Raised
      },
      {
        "status_key": "In Escrow",
        "status_value": InvoiceStatus.InEscrow
      },
      {
        "status_key": "Due",
        "status_value": InvoiceStatus.Due
      },
      {
        "status_key": "In Review",
        "status_value": InvoiceStatus.InReview
      },
      {
        "status_key": "Paid",
        "status_value": InvoiceStatus.Paid
      },
      {
        "status_key": "Failed",
        "status_value": InvoiceStatus.Failed
      },
      {
        "status_key": "Completed",
        "status_value": InvoiceStatus.Completed
      },
    ]
  }

  @Roles(Role.Buyer)
  @Get('download/buyer/:id')
  async downloadBuyerPerformaInvoice(@Param('id') id: string) {
    return await this.invoiceService.downloadBuyerPerformaInvoice(id);
  }

  @Get('download/user/:id')
  async downloadPerformaInvoice(@Param('id') id: string) {
    return await this.invoiceService.downloadPerformaInvoice(id);
  }

  @Get('provider-lead-invoices')
  async getProviderInvoices(
    @Query('providerId') providerId: string,
    @Query('leadId') leadId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('invoiceNo') invoiceNo: string,
    @Query('status') status: InvoiceStatus,
    @Query('page') page: string,
    @Query('size') size: string,) {
    return await this.invoiceService.getProviderLeadInvoices(providerId, leadId, dateFrom, dateTo, invoiceNo, status, page, size);
  }

  @Roles(Role.Buyer)
  @Get('buyer-lead-pending-invoices')
  async getBuyerRaisedInvoices(
    @Query('buyerId') buyerId: string,
    @Query('leadId') leadId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('invoiceNo') invoiceNo: string,
    @Query('page') page: string,
    @Query('size') size: string,) {
    return await this.invoiceService.getBuyerLeadRaisedInvoices(buyerId, leadId, dateFrom, dateTo, invoiceNo, page, size);
  }

  @Roles(Role.Buyer)
  @Get('buyer-lead-transaction-invoices')
  async getBuyerPaidInvoices(
    @Query('buyerId') buyerId: string,
    @Query('leadId') leadId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('invoiceNo') invoiceNo: string,
    @Query('status') status: InvoiceStatus,
    @Query('page') page: string,
    @Query('size') size: string,) {
    return await this.invoiceService.getBuyerLeadTransactionInvoices(buyerId, leadId, dateFrom, dateTo, invoiceNo, status, page, size);
  }

  @Get('user-subscription-invoices/:id')
  async getUserSubscritionInvoices(@Param('id') userId: string) {
    return await this.invoiceService.getUserSubscriptionInvoices(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const invoice = await this.invoiceService.findOne(id);
      if (invoice) {
        return {
          success: true,
          data: invoice
        }
      } else {
        return {
          success: false,
          error: "No invoice exists with given id!"
        }
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: "Problem in fetching the invoice!"
      }
    }
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoiceService.update(+id, updateInvoiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(+id);
  }
}
