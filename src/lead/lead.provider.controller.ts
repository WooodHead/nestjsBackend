import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { SentryInterceptor } from 'src/sentry.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/type/role.enum';
import { BuyerLeadService } from './lead.buyer.service';
import { ProviderLeadService } from './lead.provider.service';
import { LeadDto } from './types/lead.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(SentryInterceptor)
@Controller('lead')
export class ProviderLeadController {
  constructor(private providerLeadService: ProviderLeadService) {}

  @Get('provider/all-leads')
  viewAllProviderLeads(
    @Req() req,
    @Query('page') page,
    @Query('status') status,
  ) {
    const providerId = req.user.id;
    return this.providerLeadService.viewAllLeads(providerId, page, status);
  }

  @Get('provider/viewall/')
  viewAllRequested(@Req() req, @Query('page') page, @Query('status') status) {
    const providerId = req.user.id;
    return this.providerLeadService.viewAllSpecificLeads(
      providerId,
      page,
      status,
    );
  }

  @Get('provider/progressLeads')
  viewProviderProgressLeads(
    @Req() req,
    @Query('page') page,
    @Query('status') status,
  ) {
    return this.viewProviderProgressLeads(req.user.id, page, status);
  }

  @Get('view/leadDocument/:key')
  @Roles(Role.Buyer, Role.Provider)
  viewLeadDocument(@Param() param) {
    return this.providerLeadService.viewLeadDocument(param.key);
  }

  @Get('provider/view/:leadId')
  @Roles(Role.Provider)
  providerViewOneLead(@Req() req, @Param() param) {
    const providerId = req.user.id;
    return this.providerLeadService.providerViewOneLead(
      providerId,
      param.leadId,
    );
  }

  @Post('apply/:leadId')
  @Roles(Role.Provider)
  applyLead(@Req() req, @Param() param, @Body() body) {
    const providerId = req.user.id;

    return this.providerLeadService.applyLead(
      param.leadId,
      providerId,
      body.coverLetter,
    );
  }

  @Put('change/providerStatus/:leadId')
  changeBuyerLeadStatus(@Req() req, @Param() param, @Query() { status }) {
    const providerId = req.user.id;
    return this.providerLeadService.changeProviderLeadStatus(
      providerId,
      param.leadId,
      status,
    );
  }

  @Post('provider/lead-invite/accept')
  acceptLeadInvite(@Req() req, @Body() body) {
    const providerId = req.user.id;
    return this.providerLeadService.acceptLeadInvite(
      providerId,
      body.buyerId,
      body.leadId,
    );
  }

  @Post('provider/lead-invite/decline')
  declineLeadInvite(@Req() req, @Body() body) {
    const providerId = req.user.id;
    return this.providerLeadService.declineLeadInvite(
      providerId,
      body.buyerId,
      body.leadId,
    );
  }
}
