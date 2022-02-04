import { Controller, Get, Post, Body, Put, Param, Patch, Delete, Res, Header, Req } from '@nestjs/common';
import { AddPaymentDto } from './dto/addpaymentDetails.dto';
import { PaymentService } from './providerPayment.service';
import { UpdatePaymentDto } from './dto/updatepaymentDetails.dto'
import { Query } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('create')
  async addPaymentDetails(@Body() AddPaymentDto: AddPaymentDto) { 
    return await this.paymentService.createPaymentDetails(AddPaymentDto);
  }

  @Put('/edit')
  async update(@Query('userId') userId: string, @Query('paymentDetailsId') paymentDetailsId: string, @Body() updatePaymentDto : UpdatePaymentDto) {
    return await this.paymentService.update(userId, paymentDetailsId, updatePaymentDto);
  }

  @Put('/makeprimary')
  async makeprimary(@Query('userId') userId: string, @Query('paymentDetailsId') paymentDetailsId: string) {
    return await this.paymentService.setPrimaryAccount(userId,paymentDetailsId,)
  }

  @Get('/bankaccounts/:userId')
  async bankaccounts(@Param('userId') userId: string){
    return await this.paymentService.getAllBankAccountInfo(userId)
  }

  @Delete('/deleteaccount/:paymentDetailsId')
  async deleteAccount(@Param('paymentDetailsId') paymentDetailsId: string){
    return await this.paymentService.deleteBankAccount(paymentDetailsId)
  }
}




