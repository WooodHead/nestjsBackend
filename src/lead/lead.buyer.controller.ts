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
import { SubscriptionGuard } from '../auth/subscription.guard';
import { SentryInterceptor } from '../sentry.interceptor';
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
export class BuyerLeadController {
  constructor(private buyerLeadService: BuyerLeadService) {}

  @UseGuards(SubscriptionGuard)
  @Post('create')
  @UseInterceptors(AnyFilesInterceptor())
  createLead(
    @Req() req,
    @Body() leadDto: LeadDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    if (req.fileValidationError) {
      throw new BadRequestException(req.fileValidationError);
    }
    const userId = req.user.id;
    return this.buyerLeadService.createLead(userId, leadDto, files);
  }

  @Get('viewall/negotiating')
  viewAllNegotiatingLeads(@Req() req, @Query('page') page) {
    const buyerId = req.user.id;
    return this.buyerLeadService.viewAllNegotiatingLeads(buyerId, page);
  }

  @Get('viewall')
  viewAllLeads(@Req() req, @Query('page') page, @Query('status') status) {
    const buyerId = req.user.id;
    return this.buyerLeadService.viewAllLeads(buyerId, page, status);
  }

  @Get('buyer/view/:leadId')
  buyerViewOneLead(@Req() req, @Param() param) {
    return this.buyerLeadService.buyerViewOneLead(req.user.id, param.leadId);
  }

  @Get('view/leadDocument/:key')
  viewLeadDocument(@Param() param) {
    return this.buyerLeadService.viewLeadDocument(param.key);
  }

  @Get('delete/leadDocument/:key')
  deleteLeadDocument(@Param() param) {
    return this.buyerLeadService.deleteLeadDocument(param.key);
  }

  @Put('update/:leadId')
  @UseInterceptors(AnyFilesInterceptor())
  updateLead(
    @Req() req,
    @Param() params,
    @Body() leadDto: LeadDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    if (req.fileValidationError) {
      throw new BadRequestException(req.fileValidationError);
    }
    const buyerId = req.user.id;
    const leadId = params.leadId;
    return this.buyerLeadService.updateOneLead(buyerId, leadId, leadDto, files);
  }

  @Delete('delete/:leadId')
  deleteLead(@Param() params) {
    return this.buyerLeadService.deleteLead(params.leadId);
  }

  @Put('change/buyerStatus/:leadId')
  changeBuyerLeadStatus(@Req() req, @Param() param, @Query() { status }) {
    const buyerId = req.user.id;
    return this.buyerLeadService.changeBuyerLeadStatus(
      buyerId,
      param.leadId,
      status,
    );
  }

  @UseGuards(SubscriptionGuard)
  @Post('hire/:leadId')
  hireProvider(@Req() req, @Param() param, @Query() { providerId }) {
    const buyerId = req.user.id;
    return this.buyerLeadService.hireProvider(
      buyerId,
      param.leadId,
      providerId,
    );
  }

  @Get('view/provider/:providerId')
  viewProvideProfile(@Param() { providerId }) {
    return this.buyerLeadService.viewProviderProfile(providerId);
  }

  @Post('invite/provider')
  inviteProviderForLead(@Req() req, @Body() body) {
    const buyerId = req.user.id;
    return this.buyerLeadService.inviteProviderToLead(
      buyerId,
      body.providerId,
      body.leadId,
    );
  }

  @Get('providers/recommended')
  getRecommendedProvider() {
    return this.buyerLeadService.getRecommendedProviders();
  }
}
