import { Controller, Post, Body } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

import { ProfessionalSubscriptionDto } from './dto/create-professional.dto';

@Controller('professional-services')
export class OpenSubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('')
  createProfessionalSubscription(
    @Body() createProfessionalSubscripitonDto: ProfessionalSubscriptionDto,
  ) {
    return this.subscriptionService.createProfessionalSubscription(
      createProfessionalSubscripitonDto,
    );
  }
}
