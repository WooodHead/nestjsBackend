import {
  Controller,
  Body,
  Put,
  Get,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Delete,
  Param,
  Query,
  Post,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SentryInterceptor } from 'src/sentry.interceptor';
import { ProfileService } from './profile.service';
import { avatarFileFilter, avatarFileLimit } from './type/avatarFilter';
import { documentFileFilter, documentFileLimit } from './type/documentFilter';
import { ProfileUpdateDto } from './type/profileUpdateInput';
import { SocialMediaProperties } from './type/socialMediaProperties';
import { PaymentService } from './providerPayment.service';

@UseInterceptors(SentryInterceptor)
@Controller('user/profile')
export class ProfileController {
  constructor(private profileService: ProfileService)
   {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    return await this.profileService.getProfileByUserId(req.user.id);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async updatePrimaryDetails(
    @Req() req,
    @Body() profileUpdateDto: ProfileUpdateDto,
  ) {
    const userId = req.user.id;
    return await this.profileService.updateProfile(userId, profileUpdateDto);
  }

  @Put('/skills')
  @UseGuards(JwtAuthGuard)
  async updateUserSkill(@Req() req, @Body() body: any) {
    const { id } = req.user;
    const { skills } = body;
    return await this.profileService.updateUserSkill(id, skills);
  }

  @Put('/social-media')
  @UseGuards(JwtAuthGuard)
  async updateSocialMediaLinks(
    @Req() req,
    @Body() socialMediaLinks: SocialMediaProperties,
  ) {
    const userId = req.user.id;
    return await this.profileService.updateSocialMediaLinks(
      userId,
      socialMediaLinks,
    );
  }

  @Put('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: avatarFileLimit,
      fileFilter: avatarFileFilter,
    }),
  )
  async updateAvatar(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (req.fileValidationError) {
      throw new BadRequestException(req.fileValidationError);
    }
    if (!file) {
      throw new BadRequestException('Invalid file uploaded.');
    }
    return await this.profileService.updateAvatar(
      req.user.id,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Delete('avatar')
  @UseGuards(JwtAuthGuard)
  async deleteAvatar(@Req() req) {
    return await this.profileService.deleteAvatar(req.user.id);
  }

  @Get('document')
  @UseGuards(JwtAuthGuard)
  async getDocumentKeys(@Req() req) {
    const resp = await this.profileService.getDocumentKeys(req.user.id);
    if (!resp) {
      return {
        success: false,
        msg: 'Error! Something went wrong.',
      };
    }
    const { id, ...keys } = resp;
    return {
      success: true,
      keys,
    };
  }

  @Get('document-url')
  @UseGuards(JwtAuthGuard)
  async getDocumentURL(@Query() key) {
    const doc_key = await this.profileService.viewDocumentURL(key);
    if (!doc_key) {
      return {
        success: false,
        msg: 'Error! Something went wrong.',
      };
    }
    return doc_key;
  }

  @Put('document')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: documentFileLimit,
      fileFilter: documentFileFilter,
    }),
  )
  async updateDocument(
    @Req() req,
    @Body() { documentType }: { documentType: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (req.fileValidationError) {
      throw new BadRequestException(req.fileValidationError);
    }
    if (!file) {
      throw new BadRequestException('Invalid file uploaded.');
    }
    return await this.profileService.updateDocument(
      req.user.id,
      documentType,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  async updateVerificationStatus(@Req() req) {
    return await this.profileService.makeProfileVerificationPending(
      req.user.id,
    );
  }

  @Get('stepper')
  @UseGuards(JwtAuthGuard)
  async getStepperCount(@Req() req) {
    const { id } = req.user;
    return await this.profileService.getProfileStepper(id);
  }
}
