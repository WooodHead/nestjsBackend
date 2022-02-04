import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as AWS from 'aws-sdk';
import { compareAsc } from 'date-fns';
import fetch from 'node-fetch';
import { User } from 'src/user/entities/user.entity';
import { Error } from 'src/user/type/userResponse';
import { UserService } from 'src/user/user.service';
import {
  createQueryBuilder,
  getConnection,
  getRepository,
  Repository,
  Timestamp,
} from 'typeorm';
import { filterXSS } from 'xss';
import { Profile } from './entities/profile.entity';
import { Document } from './entities/document.entity';
import { socialMediaLinks } from './schema/socialMediaLinks.schema';
import updateProfileSchema from './schema/updateProfile.schema';
import {
  basicProfileUpdateKey,
  ProfileUpdateDto,
} from './type/profileUpdateInput';
import {
  AvatarDeleteResponse,
  AvatarUpdateResponse,
  DocumentUpdateResponse,
  ProfileUpdateResponse,
} from './type/responses';
import { SocialMediaProperties } from './type/socialMediaProperties';
import { getPreSignedURLForGet } from './utils/getPreSignedURLGET';
import { getPreSignedURLForPut } from './utils/getPreSignedURLPUT';
import { Organization } from 'src/organization/entities/organization.entity';
import { Lead } from 'src/lead/entities/lead.entity';
import { leadStatusEnum } from 'src/lead/types/leadStatus';
import { userTypeEnum } from 'src/user/type/userType';
import { ProviderStatus } from 'src/lead/utils/providerStatus';
import { BuyerStatus } from 'src/lead/utils/buyerStatus';
import { ReviewService } from 'src/review/review.service';
import { UserSkill } from './entities/user-skill.entity';

import { SkillService } from '../skill/skill.service';
import { profileTypeEnum } from 'src/user/type/profileType';
import { OrganizationService } from 'src/organization/organization.service';
import { profileVerificationEnum } from './type/profileVerificationType';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { saveLogs } from 'src/util/logger';
import organizationBuyerSchema from './schema/organizationBuyerSchema';
import organizationProviderSchema from './schema/organizationProviderSchema';
import { UserSubscriptionService } from 'src/user-subscription/user-subscription.service';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(UserSkill)
    private userSkillRepository: Repository<UserSkill>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,
    private userService: UserService,
    private organzationService: OrganizationService,
    private reviewService: ReviewService,
    private skillService: SkillService,
    private userSubscriptionService: UserSubscriptionService,
  ) {}

  async getProfileByUserId(userId: string) {
    try {
      const user = await getConnection()
        .createQueryBuilder(User, 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('user.organization', 'organization')
        .leftJoinAndSelect('profile.skills', 'profileSkills')
        .leftJoinAndSelect('profileSkills.category', 'category')
        .leftJoinAndSelect('profileSkills.subCategory', 'subCategory')
        .where('user.id = :userId', { userId: userId })
        .getOne();
      const userType = user.userType;
      const userSubscription = await this.userSubscriptionService.getSubscriptionByUserId(
        userId,
      );

      const skills = user.profile.skills
        ? user.profile.skills.map((skill) => {
            return {
              proficiency: {
                name: skill.proficiency,
              },
              category: {
                name: skill.category.name,
                id: skill.category.id,
              },
              subCategory: {
                name: skill.subCategory.name,
                id: skill.subCategory.id,
              },
            };
          })
        : [];

      const profile = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileType: user.profileType,
        userType: user.userType,
        identityNumber: user.identityNumber,
        profile: {
          bio: user.profile.bio,
          jobTitle: user.profile.jobTitle,
          skills: skills,
          avatar: user.profile.avatar,
          dob: user.profile.dob,
          mobile: user.profile.mobile,
          address1: user.profile.address1,
          address2: user.profile.address2,
          city: user.profile.city,
          state: user.profile.state,
          zip: user.profile.zip,
          country: user.profile.country,
          verificationStatus: user.profile.verificationStatus,
          payRate: user.profile.payRate,
          socialMediaLinks: user.profile.socialMediaLinks,
          payType: user.profile.payType,
          engagement: user.profile.engagement,
          payCurrency: user.profile.payCurrency,
          userSubscription: userSubscription &&
            compareAsc(userSubscription.expires_at, new Date()) !== -1
              ? 'active'
              : 'expired',
        },
        organization: user.organization,
      };

      // For Review
      const review = await this.reviewService.getAverageReview(userId);

      //finding different leads count according to userType
      if (userType === userTypeEnum.Buyer) {
        const myLeads = await getRepository(Lead)
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.buyer', 'leadBuyer')
          .where('leadBuyer.buyerId=:buyerId', { buyerId: userId })
          .andWhere('leadBuyer.status=:negotiating', {
            negotiating: BuyerStatus.Negotiating,
          })
          .getCount();
        const activeLeads = await getRepository(Lead)
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.buyer', 'leadBuyer')
          .where('leadBuyer.buyerId=:buyerId', { buyerId: userId })
          .andWhere('leadBuyer.status=:active', {
            active: BuyerStatus.Active,
          })
          .getCount();
        const completedLeads = await getRepository(Lead)
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.buyer', 'leadBuyer')
          .where('leadBuyer.buyerId=:buyerId', { buyerId: userId })
          .andWhere('leadBuyer.status=:completed', {
            completed: BuyerStatus.Completed,
          })
          .getCount();
        const result = {
          success: true,
          ...profile,
          myLeads,
          activeLeads,
          completedLeads,
          review,
        };
        return result;
      }
      if (userType === userTypeEnum.Provider) {
        const requestedLeads = await getRepository(Lead)
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.providers', 'leadProviders')
          .where('leadProviders.status=:requested', {
            requested: ProviderStatus.Requested,
          })
          .andWhere('leadProviders.providerId=:providerId', {
            providerId: userId,
          })
          .getCount();
        const activeLeads = await getRepository(Lead)
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.providers', 'leadProviders')
          .where('leadProviders.providerId=:providerId', { providerId: userId })
          .andWhere('leadProviders.status=:active', {
            active: ProviderStatus.Active,
          })
          .getCount();
        const invitedLeads = await getRepository(Lead)
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.providers', 'leadProviders')
          .where('leadProviders.providerId=:providerId', { providerId: userId })
          .andWhere('leadProviders.status=:invited', {
            invited: ProviderStatus.Invited,
          })
          .getCount();
        const completedLeads = await getRepository(Lead)
          .createQueryBuilder('lead')
          .leftJoinAndSelect('lead.providers', 'leadProviders')
          .where('leadProviders.providerId=:providerId', { providerId: userId })
          .andWhere('leadProviders.status=:invited', {
            invited: ProviderStatus.Completed,
          })
          .getCount();
        const result = {
          success: true,
          ...profile,
          myLeads: 0,
          requestedLeads,
          activeLeads,
          invitedLeads,
          completedLeads,
          review,
        };
        return result;
      }
    } catch (err) {
      console.log(err);
      saveLogs(this.logger, 'at getting user profile', err, userId);
      return {
        success: false,
      };
    }
  }

  async updateProfile(
    userId: string,
    profileUpdateDto: ProfileUpdateDto,
  ): Promise<ProfileUpdateResponse> {
    try {
      Object.keys(profileUpdateDto).forEach((key) => {
        const sanitizedValue = filterXSS(profileUpdateDto[key]);
        profileUpdateDto[key] = sanitizedValue;
      });
      const currentProfile: Profile = await this.profileRepository.findOne({
        where: [{ user: userId }],
        relations: ['user'],
      });
      if (
        currentProfile.user.userType === 'Buyer' &&
        currentProfile.user.profileType === 'Organization'
      ) {
        await organizationBuyerSchema.validate(
          { ...profileUpdateDto },
          { abortEarly: false },
        );
      } else if (
        currentProfile.user.userType === 'Provider' &&
        currentProfile.user.profileType === 'Organization'
      ) {
        await organizationProviderSchema.validate(
          { ...profileUpdateDto },
          { abortEarly: false },
        );
      } else {
        await updateProfileSchema.validate(
          { ...profileUpdateDto },
          { abortEarly: false },
        );
      }

      const {
        firstName,
        lastName,
        organization,
        identityNumber,
        name,
        totalEmployees,
        ...profileData
      } = profileUpdateDto;
      await this.userService.updateUserFromProfile(
        userId,
        firstName,
        lastName,
        identityNumber,
      );
      if (currentProfile.user.profileType === profileTypeEnum.Organization) {
        await this.organzationService.updateOrganizationInfo(
          userId,
          profileUpdateDto,
        );
      }

      basicProfileUpdateKey.forEach((key) => {
        // ensuring the payrate value is always saved as number to database by parsing it
        if (key === 'payRate') {
          currentProfile[key] = parseInt(profileData[key], 10)
            ? parseInt(profileData[key], 10)
            : 0;
          return;
        }

        // comparing the old and new mobile number of user in order to revert back the verification status
        if (currentProfile.mobile !== profileData.mobile) {
          currentProfile.verificationStatus = profileVerificationEnum.Pending;
        }
        if (
          currentProfile.user.profileType === 'Individual' &&
          key == 'totalEmployees'
        ) {
          return;
        }
        if (profileData[key]) {
          currentProfile[key] = profileData[key].trim();
        }
      });
      currentProfile.stepper = Math.max(currentProfile.stepper, 1);

      await this.profileRepository.save(currentProfile);
      return {
        success: true,
        message: 'Profile updated successfully.',
      };
    } catch (error) {
      console.log(error);
      saveLogs(this.logger, 'at updating user profile', error, userId);
      this.logger.error({
        at: 'updating user profile',
        time: new Date(),
        issue: error,
        userId: userId,
      });
      const validationErrors: [Error] = [{}]; // Adding an empty field for type.
      validationErrors.pop(); // Removing the empty added item
      if (error) {
        error.inner.forEach((d) =>
          validationErrors.push({ field: d.path, message: d.errors[0] }),
        );
        return {
          success: false,
          error: validationErrors,
        };
      } else {
        return {
          success: false,
          error: null,
        };
      }
    }
  }

  async updateUserSkill(userId: string, skills: any) {
    try {
      const userProfile = await this.profileRepository.findOne({
        where: [{ user: userId }],
      });
      const oldSkills = await this.userSkillRepository.find({
        where: [{ profile: userProfile.id }],
      });
      if (oldSkills) {
        await this.userSkillRepository.remove(oldSkills);
      }
      await Promise.all(
        skills.map(async (skill) => {
          const userSkill: UserSkill = new UserSkill();
          userSkill.category = await this.skillService.findOneCategory(
            skill.category.id,
          );
          userSkill.subCategory = await this.skillService.findOneSubCategory(
            skill.subCategory.id,
          );
          userSkill.proficiency = skill.proficiency.name;
          const userProfile = await this.profileRepository.findOne({
            where: { user: userId },
          });
          userSkill.profile = userProfile;
          return await this.userSkillRepository.save(userSkill);
        }),
      );
      userProfile.stepper = Math.max(userProfile.stepper, 4);
      await this.profileRepository.save(userProfile);
      return {
        success: true,
        message: 'Skill sets saved successfully.',
      };
    } catch (err) {
      saveLogs(this.logger, 'at updating user profile skills', err, userId);
      return {
        success: false,
        message: 'Error saving skill sets.',
      };
    }
  }
  async updateSocialMediaLinks(
    userId: string,
    socialMediaData: SocialMediaProperties,
  ) {
    try {
      await socialMediaLinks.validate(
        { ...socialMediaData },
        { abortEarly: false },
      );
      Object.keys(socialMediaData).forEach((key) => {
        socialMediaData[key] = filterXSS(socialMediaData[key]);
        socialMediaData[key] = socialMediaData[key];
      });
      const currentProfile: Profile = await this.profileRepository.findOne({
        where: [{ user: userId }],
        relations: ['user'],
      });
      currentProfile.socialMediaLinks = socialMediaData;
      currentProfile.stepper = Math.max(currentProfile.stepper, 2);
      await this.profileRepository.save(currentProfile);
      return {
        success: true,
        msg: 'Social Media Links Updated Successfully',
      };
    } catch (error) {
      saveLogs(
        this.logger,
        'at updating the user profile social medias link',
        error,
        userId,
      );
      const validationErrors: [Error] = [{}]; // Adding an empty field for type.
      validationErrors.pop(); // Removing the empty added item
      if (error) {
        error.inner.forEach((d) =>
          validationErrors.push({ field: d.path, message: d.errors[0] }),
        );
        return {
          success: false,
          error: validationErrors,
        };
      } else {
        return {
          success: false,
          error: null,
        };
      }
    }
  }
  async updateAvatar(
    userId: string,
    dataBuffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<AvatarUpdateResponse> {
    try {
      const s3 = new AWS.S3({ apiVersion: process.env.AWS_BUCKET_VERSION });
      const uploadResult = await s3
        .upload({
          Bucket: process.env.AWS_AVATAR_BUCKET,
          Body: dataBuffer,
          Key: `sakchha-avatar-${userId}`,
          ContentType: mimetype,
          ACL: 'public-read',
        })
        .promise();
      const currentProfile: Profile = await this.profileRepository.findOne({
        where: [{ user: userId }],
      });
      currentProfile.avatar = uploadResult.Location;
      await this.profileRepository.save(currentProfile);
      return {
        success: true,
        avatarURL: uploadResult.Location,
      };
    } catch (err) {
      saveLogs(this.logger, 'at updating user profile avatar', err, userId);
      return {
        success: false,
        error: 'Error uploading avatar. Try again',
      };
    }
  }

  async deleteAvatar(userId: string): Promise<AvatarDeleteResponse> {
    try {
      const s3 = new AWS.S3({ apiVersion: process.env.AWS_BUCKET_VERSION });
      await s3
        .deleteObject({
          Bucket: process.env.AWS_AVATAR_BUCKET,
          Key: userId,
        })
        .promise();
      const currentProfile: Profile = await this.profileRepository.findOne({
        where: [{ user: userId }],
      });
      currentProfile.avatar = process.env.AWS_BLANK_AVATAR;
      await this.profileRepository.save(currentProfile);
      return {
        success: true,
        message: 'Avatar removed.',
        avatarURL: process.env.AWS_BLANK_AVATAR,
      };
    } catch (err) {
      saveLogs(this.logger, 'at deleting user profile avatar', err, userId);
      return {
        success: false,
        error: err.message,
      };
    }
  }
  async updateDocument(
    userId: string,
    documentType: string,
    dataBuffer: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<DocumentUpdateResponse> {
    try {
      const key = `document-${documentType}-${userId}`;
      const url = await getPreSignedURLForPut({
        bucketName: 'sakchha-user-documents',
        key,
      });
      const response = await fetch(url, {
        headers: {
          timeout: '0',
          processData: 'false',
          mimeType: 'multipart/form-data',
          'Content-Type': mimetype,
        },
        method: 'PUT',
        body: dataBuffer,
      });
      const userDocument = await this.documentRepository.findOne({
        where: [{ user: userId }],
      });
      if (response.status === 200) {
        if (documentType.toLowerCase() === 'identity') {
          (await userDocument).identity = key;
        }
        if (documentType.toLowerCase() === 'resume') {
          (await userDocument).resume = key;
        }
        if (documentType.toLowerCase() === 'academics') {
          (await userDocument).academics = key;
        }
        if (documentType.toLowerCase() === 'achievement') {
          (await userDocument).achievement = key;
        }
      }
      await this.documentRepository.save(userDocument);
      const currentProfile: Profile = await this.profileRepository.findOne({
        where: [{ user: userId }],
      });
      currentProfile.stepper = Math.max(currentProfile.stepper, 3);
      currentProfile.verificationStatus = profileVerificationEnum.Pending;
      return { success: true, key: key };
    } catch (err) {
      saveLogs(this.logger, 'at updating user profile documents', err, userId);
      return {
        success: false,
        error: 'Error uploading document. Try again',
      };
    }
  }

  async viewDocumentURL({ key }: { key: string }) {
    const viewURL = await getPreSignedURLForGet({
      bucketName: 'sakchha-user-documents',
      key,
    });
    return viewURL;
  }

  async getDocumentKeys(userId: string) {
    const userDocument = await this.documentRepository.findOne({
      where: [{ user: userId }],
    });
    return userDocument;
  }

  async makeProfileVerificationPending(userId: string) {
    try {
      const profile: Profile = await this.profileRepository.findOne({
        where: [{ user: userId }],
      });
      profile.stepper = 6;
      profile.profileComplete = true;
      await this.profileRepository.save(profile);
      return {
        success: true,
      };
    } catch (err) {
      saveLogs(
        this.logger,
        'at making user profile verification pending',
        err,
        userId,
      );
    }
  }

  async getProfileStepper(userId: string) {
    try {
      const profile: Profile = await this.profileRepository.findOne({
        where: [{ user: userId }],
      });
      const userSubscription = await this.userSubscriptionService.getSubscriptionByUserId(
        userId,
      );
      const user = await this.userService.findUserByUserId(userId);
      return {
        success: true,
        stepper: profile.stepper,
        userSubscription:
          compareAsc(userSubscription.expires_at, new Date()) !== -1
            ? 'active'
            : 'expired',
        userType: user.userType,
      };
    } catch (err) {
      saveLogs(this.logger, 'at getting user profile stepper', err, userId);
      throw new BadRequestException();
    }
  }
}
