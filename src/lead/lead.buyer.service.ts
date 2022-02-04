import { Lead } from 'src/lead/entities/lead.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { filterXSS } from 'xss';
import { getPreSignedURLForPut } from '../profile/utils/getPreSignedURLPUT';
import { SkillService } from '../skill/skill.service';
import { UserService } from '../user/user.service';
import {
  getConnection,
  getRepository,
  Repository,
  SimpleConsoleLogger,
} from 'typeorm';
import { LeadDocument } from './entities/leadDocument.entity';
import { LeadProvider } from './entities/leadProvider.entity';
import { LeadSkill } from './entities/leadSkill.entity';
import { LeadBuyer } from './entities/leadBuyer.entity';
import { SaveDocuments } from './saveDocument.service';
import { LeadDto } from './types/lead.dto';
import { Category } from '../skill/entities/category.entity';
import { String } from 'aws-sdk/clients/acm';
import { leadStatusEnum } from './types/leadStatus';
import { getPreSignedURLForGet } from 'src/profile/utils/getPreSignedURLGET';
import { getPreSignedURLForDel } from 'src/profile/utils/getPreSignedURLDEL';
import { BuyerStatus } from './utils/buyerStatus';
import { ProviderStatus } from './utils/providerStatus';
import { LeadProviderEnum } from './types/leadProvider.enum';
import { User } from 'src/user/entities/user.entity';
import { LeadEngagementEnum } from './types/leadEngagement.enum';
import { SocketGateway } from '../websocket/websocket.gateway';
import { WebSocketService } from 'src/websocket/websocket.service';
import { NotificationService } from 'src/notification/notification.service';
import { ReviewService } from 'src/review/review.service';
import { createLeadSchema } from './schema/createLeadSchema';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { saveLogs } from 'src/util/logger';
import { ElasticSearchLead } from 'src/elasticsearch/types/elasticSearchRecord';
import { ElasticsearchService } from 'src/elasticsearch/elasticsearch.service';
import { Profile } from '../profile/entities/profile.entity';
import { profileVerificationEnum } from 'src/profile/type/profileVerificationType';
import { Error as errorResponse } from 'src/user/type/userResponse';
@Injectable()
export class BuyerLeadService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,

    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,

    @InjectRepository(LeadDocument)
    private leadDocument: Repository<LeadDocument>,

    @InjectRepository(LeadSkill)
    private leadSkill: Repository<LeadSkill>,

    @InjectRepository(LeadProvider)
    private leadProvider: Repository<LeadProvider>,

    @InjectRepository(LeadBuyer)
    private leadBuyer: Repository<LeadBuyer>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,

    private saveDocuments: SaveDocuments,
    private userService: UserService,
    private skillService: SkillService,
    private readonly socketService: SocketGateway,
    private readonly notificationService: NotificationService,
    private readonly reviewService: ReviewService,
    private esService: ElasticsearchService,
  ) {}
  async createLead(buyerId: string, leadDto: LeadDto, files: any) {
    try {
      const buyerProfile = await this.profileRepository.findOne({
        where: [{ user: buyerId }],
      });
      if (
        buyerProfile.verificationStatus !== profileVerificationEnum.Verified
      ) {
        throw new Error(
          'Your account is not verified. Only verify account can create a lead.',
        );
      }
      const newLead: Lead = new Lead();
      newLead.lead_engagement = LeadEngagementEnum.PartTime;

      //validating create lead dto
      await createLeadSchema.validate({ ...leadDto }, { abortEarly: false });

      // dereferencing skills from leadDto
      const { skills, ...leadDto1 } = leadDto;
      Object.keys(leadDto1).forEach((key) => {
        const sanitizedValue = filterXSS(leadDto1[key]);
        newLead[key] = sanitizedValue.trim();
      });

      //adding skills to the lead
      let allSkills = [];
      await Promise.all(
        JSON.parse(skills as any).map(async (skill) => {
          const leadSkill: LeadSkill = new LeadSkill();
          leadSkill.category = await this.skillService.findOneCategory(
            skill.category.id,
          );
          leadSkill.subCategory = await this.skillService.findOneSubCategory(
            skill.subCategory.id,
          );
          leadSkill.proficiency = skill.proficiency.name;
          allSkills.push(leadSkill);
        }),
      );
      newLead.skills = allSkills;

      //adding buyer and buyer status to the lead
      const buyer = await this.userService.findUserByUserId(buyerId);
      const leadBuyer: LeadBuyer = new LeadBuyer();
      leadBuyer.status = BuyerStatus.Negotiating;
      leadBuyer.buyer = buyer;
      newLead.buyer = leadBuyer;

      //adding files to the lead
      if (files) {
        const response: any = await this.saveDocuments.saveDocuments(
          files,
          leadDto.lead_title,
        );
        newLead.documents = response.allDocuments;
      }

      const saveLeadResponse = await this.leadRepository.save(newLead);
      if (saveLeadResponse) {
        // ES Changes: add records to ES
        const recordToSave: ElasticSearchLead = this.prepareESRecord(
          saveLeadResponse,
        );
        await this.esService.create(recordToSave.id, recordToSave);

        return {
          success: true,
          statusCode: 201,
          data: saveLeadResponse,
        };
      }
      return {
        success: false,
      };
    } catch (err) {
      const validationErrors: [errorResponse] = [{}]; // Adding an empty field for type.
      validationErrors.pop(); // Removing the empty added item
      if (err) {
        err.inner.forEach((d) =>
          validationErrors.push({ field: d.path, message: d.errors[0] }),
        );
        return {
          data: null,
          error: validationErrors,
          success: false,
        };
      }
      saveLogs(this.logger, 'at creating a new lead', err, buyerId);
      return { success: 'false', status: 500, message: err.message };
    }
  }

  // ES Changes: method that prepares record before storing/updating to ES domain
  prepareESRecord(savedLead: any): ElasticSearchLead {
    let esRecordToSave: ElasticSearchLead = {
      id: savedLead.id,
      lead_title: savedLead.lead_title,
      lead_description: savedLead.lead_description,
      payType: savedLead.payType,
      payRate: parseInt(savedLead.payRate),
      payCurrency: savedLead.payCurrency,
      lead_engagement: savedLead.lead_engagement,
      createdAt: savedLead.createdAt,
      skills: savedLead.skills.map((skill) => {
        let formattedSkillObject = {
          category_name: {
            name: skill.category.name,
            id: skill.category.id,
          },
          subCategory: {
            name: skill.subCategory.name,
            id: skill.subCategory.id,
          },
          proficiency: {
            name: skill.proficiency,
          },
        };
        return formattedSkillObject;
      }),
      leadStatus: savedLead?.buyer?.status,
    };
    return esRecordToSave;
  }

  async viewAllNegotiatingLeads(buyerId: string, page: string) {
    try {
      const status = BuyerStatus.Negotiating;
      const PAZE_SIZE = 3;
      const currentPage = parseInt(page || '0');
      const leadCount = await getRepository(Lead)
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.buyer', 'leadBuyer')
        .select('COUNT(lead)', 'lead')
        .where('leadBuyer.status=:buyerStatus', { buyerStatus: status })
        .andWhere('leadBuyer.buyerId=:buyerId', { buyerId })
        .getRawOne();
      const allLeads = await getRepository(Lead)
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.buyer', 'leadBuyer')
        .leftJoinAndSelect('leadBuyer.buyer', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('lead.skills', 'leadSkill')
        .leftJoinAndSelect('leadSkill.category', 'category')
        .leftJoinAndSelect('leadSkill.subCategory', 'subCategory')
        .leftJoinAndSelect('lead.documents', 'leadDocument')
        .leftJoinAndSelect('lead.providers', 'leadProvider')
        .leftJoinAndSelect('leadProvider.provider', 'providerUser')
        .select([
          'lead.id',
          'lead.lead_title',
          'lead.lead_description',
          'lead.lead_engagement',
          'lead.payType',
          'lead.payRate',
          'lead.payCurrency',
          'lead.referenceURL',
          'lead.createdAt',
          'leadBuyer.status',
          'user.firstName',
          'user.lastName',
          'profile.avatar',
          'leadSkill',
          'category',
          'subCategory',
          'leadDocument.name',
          'leadDocument.documentURL',
          'leadProvider',
          'providerUser.id',
        ])
        .where('leadBuyer.buyer=:buyer', { buyer: buyerId })
        .andWhere('leadBuyer.status=:buyerStatus', { buyerStatus: status })
        .orderBy({ 'lead.createdAt': 'DESC' })
        .take(PAZE_SIZE)
        .skip(PAZE_SIZE * currentPage)
        .getMany();
      await Promise.all(
        allLeads.map(async (lead: any) => {
          lead.status = lead.buyer.status;
          lead.buyer = lead.buyer.buyer;
          let newApplicants: number = 0;
          lead.providers?.forEach((p) => {
            const isNew = p.createdAt > lead.buyer.lastLoggedIn;
            if (isNew) newApplicants++;
            return;
          });
          delete lead.buyer; //deleting lead buyer info from lead object as it unnecessary
          lead.newApplicants = newApplicants;
          lead['totalApplicants'] = lead.providers?.length || 0;
        }),
      );
      return {
        leads: allLeads,
        totalPages: Math.ceil(leadCount.lead / PAZE_SIZE),
      };
    } catch (err) {
      saveLogs(
        this.logger,
        'at viewing all negotiating leads of buyer',
        err,
        buyerId,
      );
    }
  }

  async viewAllLeads(buyerId: string, page: string, status: string) {
    try {
      const PAZE_SIZE = 3;
      const currentPage = parseInt(page || '0');
      const leadCount = await getRepository(Lead)
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.buyer', 'leadBuyer')
        .select('COUNT(lead)', 'lead')
        .where('leadBuyer.status=:buyerStatus', { buyerStatus: status })
        .andWhere('leadBuyer.buyerId=:buyerId', { buyerId })
        .getRawOne();
      const allLeads = await getRepository(Lead)
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.buyer', 'leadBuyer')
        .leftJoinAndSelect('leadBuyer.buyer', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('lead.skills', 'leadSkill')
        .leftJoinAndSelect('leadSkill.category', 'category')
        .leftJoinAndSelect('leadSkill.subCategory', 'subCategory')
        .leftJoinAndSelect('lead.documents', 'leadDocument')
        .leftJoinAndSelect('lead.providers', 'leadProvider')
        .leftJoinAndSelect('leadProvider.provider', 'providerUser')
        .leftJoinAndSelect('providerUser.profile', 'providerUserProfile')
        .select([
          'lead.id',
          'lead.lead_title',
          'lead.lead_description',
          'lead.lead_engagement',
          'lead.payType',
          'lead.payRate',
          'lead.payCurrency',
          'lead.referenceURL',
          'lead.createdAt',
          'leadBuyer.status',
          'user.firstName',
          'user.lastName',
          'user.lastLoggedIn',
          'profile.avatar',
          'leadSkill',
          'category',
          'subCategory',
          'leadDocument.name',
          'leadDocument.documentURL',
          'leadProvider.id',
          'providerUser.firstName',
          'providerUser.lastName',
          'providerUserProfile.avatar',
        ])
        .where('leadBuyer.buyer=:buyer', { buyer: buyerId })
        .andWhere('leadBuyer.status=:buyerStatus', { buyerStatus: status })
        .orderBy({ 'lead.createdAt': 'DESC' })
        .take(PAZE_SIZE)
        .skip(PAZE_SIZE * currentPage)
        .getMany();
      await Promise.all(
        allLeads.map(async (lead: any) => {
          lead.status = lead.buyer.status;
          lead.buyer = lead.buyer.buyer;
          lead.provider =
            lead.providers.length > 0 && lead.providers[0].provider;
          let newApplicants: number = 0;
          lead.providers.forEach((p) => {
            const isNew = p.createdAt > lead.buyer.lastLoggedIn;
            if (isNew) newApplicants++;
            return;
          });
          delete lead.buyer; //deleting lead buyer info from lead object as it unnecessary
          lead.newApplicants = newApplicants;
          lead['totalApplicants'] = lead.providers.length;
        }),
      );
      return {
        leads: allLeads,
        totalPages: Math.ceil(leadCount.lead / PAZE_SIZE),
        success: true,
      };
    } catch (err) {
      saveLogs(
        this.logger,
        `at view all ${status} lead of a buyer`,
        err,
        buyerId,
      );
    }
  }

  async buyerViewOneLead(userId: string, leadId: string) {
    try {
      const leadDetails = await getRepository(Lead)
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.buyer', 'leadBuyer')
        .leftJoinAndSelect('leadBuyer.buyer', 'user')
        .select([
          'lead.id',
          'lead.lead_title',
          'lead.lead_description',
          'lead.lead_engagement',
          'lead.payRate',
          'lead.payCurrency',
          'lead.payType',
          'lead.referenceURL',
          'lead.createdAt',
          'leadBuyer.id',
          'user.id',
          'user.lastLoggedIn',
        ])
        .where({ id: leadId })
        .getOne();
      const { buyer, ...lead } = leadDetails;
      const lastLoggedIn = buyer.buyer.lastLoggedIn; // Last Logged in Time of Currently Logged in Buyer
      if (!(buyer.buyer.id == userId)) {
        return {
          success: false,
          code: 403,
          message: 'Unauthorized',
        };
      }
      const leadSkill = await getRepository(LeadSkill)
        .createQueryBuilder('leadSkill')
        .leftJoinAndSelect('leadSkill.category', 'category')
        .leftJoinAndSelect('leadSkill.subCategory', 'subCategory')
        .select(['leadSkill', 'subCategory', 'category'])
        .where('leadSkill.leadId=:leadId', { leadId })
        .getMany();

      const leadDocument = await this.leadDocument.find({
        where: [{ lead: leadId }],
        select: ['name', 'documentURL'],
      });

      const skills = [];
      leadSkill !== null &&
        leadSkill.map((a, i) => {
          skills.push({
            category: {
              name: a.category.name,
              id: a.category.id,
            },
            subCategory: {
              name: a.subCategory.name,
              id: a.subCategory.id,
            },
            proficiency: {
              name: a.proficiency,
            },
          });
        });
      const leadBuyer = await this.leadBuyer.findOne({
        where: [{ lead: leadId }],
      });

      const providers =
        leadBuyer.status === 'Active' ||
        leadBuyer.status === BuyerStatus.Completed
          ? await getRepository(LeadProvider)
              .createQueryBuilder('leadProvider')
              .leftJoinAndSelect('leadProvider.provider', 'provider')
              .leftJoinAndSelect('provider.profile', 'profile')
              .select([
                'leadProvider.id',
                'leadProvider.createdAt',
                'leadProvider.coverLetter',
                'provider.firstName',
                'provider.lastName',
                'profile.avatar',
                'provider.id',
                'profile.jobTitle',
                'profile.payRate',
                'profile.payType',
                'profile.payCurrency',
                'profile.engagement',
                'leadProvider.status',
              ])
              .where('leadProvider.leadId=:leadId', { leadId })
              .getMany()
          : await getRepository(LeadProvider)
              .createQueryBuilder('leadProvider')
              .leftJoinAndSelect('leadProvider.provider', 'provider')
              .leftJoinAndSelect('provider.profile', 'profile')
              .select([
                'leadProvider.id',
                'leadProvider.createdAt',
                'leadProvider.coverLetter',
                'provider.firstName',
                'provider.lastName',
                'profile.avatar',
                'provider.id',
                'profile.jobTitle',
                'profile.payRate',
                'profile.payType',
                'profile.payCurrency',
                'profile.engagement',
              ])
              .where('leadProvider.leadId=:leadId', { leadId })
              .andWhere('leadProvider.status=:leadStatus', {
                leadStatus: ProviderStatus.Requested,
              })
              .getMany();
      // Checking for new
      let newApplicants: number = 0;
      await Promise.all(
        providers.map(async (p) => {
          const isNew = p.createdAt > lastLoggedIn;
          if (isNew) ++newApplicants;
          p['isNew'] = isNew;

          //getting review for the each providers
          p['review'] = await this.reviewService.getAverageReview(
            p.provider.id,
          );
          return p;
        }),
      );
      const invitedProviders = await getRepository(LeadProvider)
        .createQueryBuilder('leadProvider')
        .leftJoinAndSelect('leadProvider.provider', 'provider')
        .leftJoinAndSelect('provider.profile', 'profile')
        .select([
          'leadProvider.id',
          'provider.firstName',
          'provider.lastName',
          'profile.avatar',
          'provider.id',
          'profile.jobTitle',
          'profile.payRate',
          'profile.payType',
          'profile.payCurrency',
          'profile.engagement',
        ])
        .where('leadProvider.leadId=:leadId', { leadId })
        .andWhere('leadProvider.status=:leadStatus', {
          leadStatus: ProviderStatus.Invited,
        })
        .getMany();

      const result = {
        ...lead,
        skills: skills,
        documents: leadDocument,
        applicants: providers,
        invitedApplicants: invitedProviders,
        leadStatus: leadBuyer.status,
        newApplicants,
      };
      return result;
    } catch (err) {
      saveLogs(this.logger, 'at view one lead by buyer', err, userId, leadId);
    }
  }

  async updateOneLead(
    buyerId: string,
    leadId: string,
    leadDto: LeadDto,
    files,
  ) {
    //TODO: confirm buyerId and lead buyerId are same
    try {
      const lead = await this.leadRepository.findOne(
        { id: leadId },
        { relations: ['buyer', 'buyer.buyer'] },
      );
      if (lead.buyer.buyer.id === buyerId) {
        //removing all one to many skills
        const oldSkills = await this.leadSkill.find({
          where: [{ lead: leadId }],
        });
        await this.leadSkill.remove(oldSkills);
        //finding existing lead
        const oldLead: Lead = await this.leadRepository.findOne({
          where: [{ id: leadId }],
          relations: ['skills', 'buyer', 'documents'],
        });
        //deferencing and sanitizing the input values
        const { skills, ...leadDto1 } = leadDto;
        Object.keys(leadDto1).forEach((key) => {
          const sanitizedValue = filterXSS(leadDto1[key]);
          oldLead[key] = sanitizedValue.trim();
        });

        //assiginging new skills to the lead
        let allSkills = [];
        await Promise.all(
          JSON.parse(skills as any).map(async (skill) => {
            const leadSkill: LeadSkill = new LeadSkill();
            leadSkill.category = await this.skillService.findOneCategory(
              skill.category.id,
            );
            leadSkill.subCategory = await this.skillService.findOneSubCategory(
              skill.subCategory.id,
            );
            leadSkill.proficiency = skill.proficiency.name;
            allSkills.push(leadSkill);
          }),
        );
        oldLead.skills = allSkills;

        // update lead uploaded files
        if (files) {
          const response: any = await this.saveDocuments.saveDocuments(
            files,
            leadDto.lead_title,
          );
          oldLead.documents = [...oldLead.documents, ...response.allDocuments];
        }

        let saveUpdatedLeadRes = await this.leadRepository.save(oldLead);
        if (saveUpdatedLeadRes) {
          // ES Changes: update record in ES too
          const recordToSave: ElasticSearchLead = this.prepareESRecord(oldLead);
          await this.esService.create(recordToSave.id, recordToSave);

          return {
            success: true,
            statusCode: 201,
          };
        }
        return {
          success: false,
        };
      } else {
        throw new Error('Not authorized to delete');
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at update one lead by buyer',
        err,
        buyerId,
        leadId,
      );
    }
  }

  async deleteLead(leadId: string) {
    try {
      if (await this.leadRepository.delete({ id: leadId })) {
        // ES Changes: delete record from ES too
        await this.esService.removeRecord(leadId);
        return {
          success: true,
        };
      }
      return {
        success: false,
      };
    } catch (err) {
      saveLogs(this.logger, 'at deleting one lead', err, null, leadId);
      return {
        success: false,
      };
    }
  }

  // View Lead Document
  async viewLeadDocument(key: string) {
    return await getPreSignedURLForGet({
      bucketName: process.env.AWS_LEAD_DOCUMENT_BUCKET,
      key,
    });
  }

  // View Delete Document
  async deleteLeadDocument(key: string) {
    try {
      return Promise.all([
        await getPreSignedURLForDel({
          bucketName: process.env.AWS_LEAD_DOCUMENT_BUCKET,
          key,
        }),
        await this.leadDocument.delete({ documentURL: key }),
      ])
        .then(() => {
          return {
            success: true,
            message: 'Document removed successfully.',
          };
        })
        .catch((err) => new Error(err));
    } catch (err) {
      return {
        success: false,
        message: 'Error removing document. Try again.',
      };
    }
  }

  async hireProvider(buyerId: string, leadId: string, providerId: string) {
    try {
      const lead = await this.leadRepository.findOne({ id: leadId });
      const leadBuyer = await this.leadBuyer.findOne({
        where: { lead: leadId, buyer: buyerId },
      });
      //checking if lead belongs to the buyer
      if (leadBuyer) {
        //changing buyer lead status
        leadBuyer.status = BuyerStatus.Active;
        await this.leadBuyer.save(leadBuyer);

        //finding the hire provider and changing its lead status
        const leadProvider = await this.leadProvider.findOne({
          where: { lead: leadId, provider: providerId },
        });
        leadProvider.status = ProviderStatus.Active;
        await this.leadProvider.save(leadProvider);

        // ES Change: change leadStatus
        await this.esService.updateStatus(leadId, BuyerStatus.Active);

        // finding all other providers who applied for the lead and deleting them
        await getConnection()
          .createQueryBuilder()
          .delete()
          .from(LeadProvider)
          .where('providerId != :providerId', { providerId })
          .andWhere('leadId=:leadId', { leadId })
          .execute();

        // sending the provider notification that they have been selected for lead
        const message = `${lead.lead_title} lead has been started.`;
        const notification = await this.notificationService.saveNotification(
          providerId,
          message,
        );
        this.socketService.server
          .to(providerId)
          .emit('Notification', notification);

        return {
          success: true,
          message: 'Lead has started.',
        };
      } else {
        throw new Error('Lead doesnt belong to the buyer.');
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at hiring a provider for a lead',
        err,
        buyerId,
        leadId,
      );
      return {
        success: false,
        message: 'Error. Try again.',
      };
    }
  }

  // Change the Status of Lead form Buyer Side
  async changeBuyerLeadStatus(
    buyerId: string,
    leadId: string,
    leadStatus: BuyerStatus,
  ) {
    try {
      //finding lead
      const lead = await this.leadRepository.findOne({ id: leadId });
      //finding if the lead exist to that buyer or not
      const leadBuyer = await this.leadBuyer.findOne({
        where: [{ lead: leadId, buyer: buyerId }],
      });

      //if lead exist to that buyer
      if (leadBuyer && leadBuyer.status === BuyerStatus.Active) {
        // changing buyer status to that lead
        // putting buyer status to completed if buyer has requested so or else keeping it as old one
        // i.e if leadStatus is to be set to Completed then only changing it.
        leadBuyer.status = leadStatus
          ? BuyerStatus.Completed
          : leadBuyer.status;

        //TODO: Make sure to uncomment this
        await this.leadBuyer.save(leadBuyer);

        // ES Change: change leadStatus
        await this.esService.updateStatus(leadId, BuyerStatus.Completed);

        // finding the provider for the lead
        const leadProvider = await this.leadProvider.findOne({
          where: [{ lead: leadId }],
          relations: ['provider'],
        });
        const providerId = leadProvider.provider.id;
        const message = `${lead.lead_title} lead's status has been moved to ${leadStatus} state by the buyer.`;

        //sending the notification to that provider stating the lead has been completed from buyer side
        const notification = await this.notificationService.saveNotification(
          providerId,
          message,
        );
        this.socketService.server
          .to(providerId)
          .emit('Notification', notification);

        return {
          success: true,
        };
      } else {
        throw new Error('unable to change lead status');
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at updating the buyer lead status',
        err,
        buyerId,
        leadId,
      );
      return {
        success: false,
      };
    }
  }

  //view provider profile from buyer dashboard
  async viewProviderProfile(providerId: string) {
    try {
      const provider: any = await getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.documents', 'documents')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('profile.skills', 'profileSkills')
        .leftJoinAndSelect('profileSkills.subCategory', 'subCategory')
        .select([
          'user.firstName',
          'user.lastName',
          'user.userType', // Used for checking whether or not the provider Id belongs to user or not
          'profile.payCurrency',
          'profile.engagement',
          'profile.payType',
          'profile.payRate',
          'profile.bio',
          'profile.socialMediaLinks',
          'profile.avatar',
          'profile.jobTitle',
          'profile.payType',
          'documents.resume',
          'profileSkills',
          'subCategory',
        ])
        .where('user.id=:providerId', { providerId })
        .getOne();
      if (provider.userType != 'Provider') {
        return {
          success: false,
          message: 'Not Found',
        };
      }
      const formattedSkill = provider.profile.skills.map((skill) => {
        return skill.subCategory.name;
      });
      provider.profile.skills = formattedSkill;
      const review = await this.reviewService.getAverageReview(providerId);
      const leads = await getRepository(LeadProvider)
        .createQueryBuilder('leadProvider')
        .leftJoinAndSelect('leadProvider.lead', 'lead')
        .leftJoinAndSelect('leadProvider.provider', 'providerUser')
        .select([
          'lead.id',
          'lead.lead_title',
          'lead.lead_description',
          'leadProvider.status',
          'providerUser.id',
        ])
        .where('providerUser.id=:providerId', { providerId })
        .andWhere('leadProvider.status IN (:...status)', {
          status: ['Active', 'Completed'],
        })
        // .andWhere('leadProvider.status=:completeStatus', {
        //   completeStatus: 'Completed',
        // })
        .getMany();
      const new_leads = [];
      return Promise.all(
        leads.map(async (l) => {
          const review = await this.reviewService.getBuyerReviewForLead(
            providerId,
            l.lead.id,
          );
          l['review'] = review;
          new_leads.push(l);
        }),
      ).then((d) => {
        return {
          success: true,
          name: `${provider.firstName} ${provider.lastName}`,
          ...provider.profile,
          resume:
            provider.documents && provider.documents.resume
              ? provider.documents.resume
              : null,
          leads: new_leads,
          review,
        };
      });
    } catch (err) {
      saveLogs(
        this.logger,
        'at buyer viewing provider profile where argument is providerId',
        err,
        providerId,
      );
      return {
        success: false,
      };
    }
  }

  async inviteProviderToLead(buyerId, providerId, leadId) {
    try {
      const lead = await this.leadRepository.findOne({ id: leadId });
      const leadBuyer = await this.leadBuyer.findOne({
        where: [{ lead: leadId, buyer: buyerId }],
      });
      //checking if lead belongs to same buyer and lead status is Negotiating
      if (leadBuyer && leadBuyer.status === BuyerStatus.Negotiating) {
        //check if provider has applied for that lead or not
        const leadProvider = await this.leadProvider.findOne({
          where: [{ lead: leadId, provider: providerId }],
        });
        if (leadProvider) {
          const responseMessage =
            leadProvider.status === ProviderStatus.Invited
              ? 'Provider has been already sent invite to the lead'
              : 'Provider has already requested for the lead.';
          return {
            success: true,
            message: responseMessage,
          };
        }
        if (!leadProvider) {
          const newLeadProvider: LeadProvider = new LeadProvider();
          newLeadProvider.lead = await this.leadRepository.findOne({
            id: leadId,
          });
          newLeadProvider.provider = await this.userRepository.findOne({
            id: providerId,
          });
          newLeadProvider.status = ProviderStatus.Invited;
          await this.leadProvider.save(newLeadProvider);

          //sending notification to provider to notify they have been invited to work for the lead.
          const message = `You have received an invitation to the ${lead.lead_title} lead.`;
          const notification = await this.notificationService.saveNotification(
            providerId,
            message,
          );
          this.socketService.server
            .to(providerId)
            .emit('Notification', notification);

          return {
            success: true,
            message: 'Provider has sent with a invite for the lead.',
          };
        }
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at inviting a provider to a lead where user is providerid',
        err,
        providerId,
        leadId,
      );
      return {
        success: false,
        message: 'Error sending invite to the provider. Try again.',
      };
    }
  }

  // Recommends providers in buyer dashboard
  async getRecommendedProviders() {
    try {
      const recommendProviders = await getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('profile.skills', 'userSkills')
        .leftJoinAndSelect('userSkills.category', 'categories')
        .leftJoinAndSelect('userSkills.subCategory', 'subCategories')
        .select([
          'user.id',
          'user.firstName',
          'user.lastName',
          'profile.avatar',
          'profile.jobTitle',
          'profile.payRate',
          'profile.payCurrency',
          'profile.payType',
          'userSkills.proficiency',
          'categories.name',
          'subCategories.name',
        ])
        .where('user.userType=:userType', { userType: 'Provider' })
        .andWhere('profile.verificationStatus = :verificationStatus', {
          verificationStatus: 'Verified',
        })
        .andWhere('profile.profileComplete = :profileComplete', {
          profileComplete: true,
        })
        .orderBy({ 'user.createdAt': 'DESC' })
        .limit(15)
        .getMany();
      recommendProviders.forEach((provider: any) => {
        const allSkills = provider.profile.skills.map((skillObj) => {
          return skillObj.subCategory?.name;
        });
        provider.profile.skills = allSkills;
      });
      if (recommendProviders && recommendProviders.length > 0) {
        return {
          success: true,
          message: 'Recommended providers fetched successfully!',
          recommendProviders: recommendProviders,
        };
      } else {
        return {
          success: true,
          message: 'There are no any providers to recommend at the moment!',
          recommendProviders: recommendProviders,
        };
      }
    } catch (error) {
      console.log(error);
      return {
        return: false,
        error: 'Problem in fetching recommended providers!',
      };
    }
  }
}
