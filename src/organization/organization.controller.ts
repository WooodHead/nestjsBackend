import { Controller, Post, UseInterceptors } from '@nestjs/common';
import { SentryInterceptor } from 'src/sentry.interceptor';
import { OrganizationService } from './organization.service';

@UseInterceptors(SentryInterceptor)
@Controller('organization')
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}
}
