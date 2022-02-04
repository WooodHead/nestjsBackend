import { PaymentDto } from './dto/payment.dto';
import { Body, Controller, Post, Get } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('info')
  async initiatePayment(@Body() paymentData: PaymentDto) {
    return await this.paymentService.generateHash(paymentData);
  }

  @Post('response')
  async paymentResponse(@Body() paymentResponseHBL: any) {
    return await this.paymentService.handlePaymentRespone(paymentResponseHBL);
  }
}
