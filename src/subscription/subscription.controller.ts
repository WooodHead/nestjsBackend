import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ProfessionalSubscriptionDto } from './dto/create-professional.dto';

@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('available')
  fetchAvailableSubscriptions() {
    return this.subscriptionService.getBuyerAvailableSubscriptions();
  }

  @Post('professional')
  createProfessionalSubscription(
    @Body() createProfessionalSubscripitonDto: ProfessionalSubscriptionDto,
  ) {
    return this.subscriptionService.createProfessionalSubscription(
      createProfessionalSubscripitonDto,
    );
  }
}
