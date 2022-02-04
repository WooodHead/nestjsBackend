import { Profile } from './../profile/entities/profile.entity';
import { ElasticsearchService } from './../elasticsearch/elasticsearch.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { filterXSS } from 'xss';
import { getPreSignedURLForPut } from '../profile/utils/getPreSignedURLPUT';
import { SkillService } from '../skill/skill.service';
import { UserService } from '../user/user.service';
import { getConnection, getRepository, Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
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
import { BuyerLeadService } from './lead.buyer.service';
import { NotificationService } from 'src/notification/notification.service';
import { SocketGateway } from 'src/websocket/websocket.gateway';
import { ReviewService } from 'src/review/review.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { saveLogs } from 'src/util/logger';
import { UserSkill } from 'src/profile/entities/user-skill.entity';
import { profileVerificationEnum } from 'src/profile/type/profileVerificationType';

@Injectable()
export class ProviderLeadService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,

    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,

    @InjectRepository(LeadDocument)
    private leadDocument: Repository<LeadDocument>,

    @InjectRepository(LeadSkill)
    private leadSkill: Repository<LeadSkill>,

    @InjectRepository(UserSkill)
    private userSkillRepository: Repository<UserSkill>,

    @InjectRepository(LeadProvider)
    private leadProvider: Repository<LeadProvider>,

    @InjectRepository(Profile)
    private profileRepo: Repository<Profile>,

    @InjectRepository(LeadBuyer)
    private leadBuyer: Repository<LeadBuyer>,

    private saveDocuments: SaveDocuments,
    private userService: UserService,
    private skillService: SkillService,
    private buyerLeadService: BuyerLeadService,
    private readonly socketService: SocketGateway,
    private notificationService: NotificationService,
    private reviewService: ReviewService,
    private esService: ElasticsearchService,
  ) { }

  async viewAllLeads(providerId: string, page: string, status: BuyerStatus) {
    try {
      // TODO: Need skip and take value from query
      const PAZE_SIZE = 3;
      const currentPage = parseInt(page || '0');

      // ES changes: gets skills from body, get the matching leads Ids
      const userProfile = await this.profileRepo.findOne({
        where: [{ user: providerId }],
        select: ['id'],
      });
      const userSkills: Array<any> = await this.userSkillRepository.find({
        where: [{ profile: userProfile.id }],
        relations: ['subCategory'],
      });
      let subCategories = userSkills.map((userSkill) => {
        return userSkill.subCategory.name;
      });

      let skillsFilterResponse = await this.getESFilteredLeads(subCategories, currentPage, PAZE_SIZE);
      if (!skillsFilterResponse.success) {
        console.log('Unable to get ids from ES!');
      }
      const filteredLeadIds: Array<any> =
        (skillsFilterResponse && skillsFilterResponse.filterdIds) || [];

      let leadCount = {
        lead: 0,
      };

      if (filteredLeadIds.length > 0) {

        leadCount.lead = skillsFilterResponse.filterdIdsCount || 0

        // leadCount = await getRepository(Lead)
        //   .createQueryBuilder('lead')
        //   .leftJoinAndSelect('lead.buyer', 'leadBuyer')
        //   .select('COUNT(lead)', 'lead')
        //   .where('leadBuyer.status=:initiated', {
        //     initiated: 'Negotiating',
        //   })
        //   .andWhere('lead.id IN (:...leadIds)', { leadIds: filteredLeadIds })
        //   .getRawOne();

      }

      let allLeadsQueryBuilder = getRepository(Lead)
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.buyer', 'leadBuyer')
        .leftJoinAndSelect('leadBuyer.buyer', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('lead.skills', 'leadSkill')
        .leftJoinAndSelect('leadSkill.category', 'category')
        .leftJoinAndSelect('leadSkill.subCategory', 'subCategory')
        .leftJoinAndSelect('lead.documents', 'leadDocument')
        .leftJoinAndSelect('lead.providers', 'leadProviders')
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
          'category', // filter out category and sub category
          'subCategory',
          'leadDocument.name',
          'leadDocument.documentURL',
          'leadProviders.status',
          'leadProviders',
        ])
        .where('leadBuyer.status=:initiated', {
          initiated: 'Negotiating',
        });

      // ES Changes: fetch only leads with matching Ids
      if (filteredLeadIds.length > 0) {
        let allLeads = await allLeadsQueryBuilder
          .andWhere('lead.id IN (:...leadIds)', { leadIds: filteredLeadIds })
          .orderBy({ 'lead.createdAt': 'DESC' })
          .getMany();

        allLeads.map((lead: any) => {
          lead.buyer = lead.buyer.buyer;
        });

        return {
          leads: allLeads,
          totalPages: Math.ceil(leadCount.lead / PAZE_SIZE),
        };
      }
      // .andWhere('leadProviders.providerId NOT IN :provider', {
      //   provider: providerId,
      // })

      // ES Changes: no matching leads then send user friendly message
      return {
        leads: [],
        totalPages: 0,
        message:
          'Please update your skills so that we can match some leads for you!',
      };
    } catch (err) {
      console.log(err);
      saveLogs(
        this.logger,
        'at provider viewing all negotiating leads',
        err,
        providerId,
      );
      return {
        success: false,
      };
    }
  }

  // ES Changes: method that returns Ids with matching skills
  async getESFilteredLeads(skills: Array<string>, offset: number, page_size: number) {
    try {
      let skillsString = skills.join(' ');
      let searchQuery = {
        "from": page_size * offset,
        "size": page_size,
        "query": {
          "bool": {
            "must": {
              "multi_match": {
                "query": skillsString,
                "fields": [
                  "*category*",
                  "*subCategory*",
                  "*title*",
                  "*description*"
                ]
              }
            },
            "filter": {
              "terms": {
                "leadStatus": ["negotiating"]
              }
            }
          }
        },
        "sort": [
          {
            "createdAt": {
              "order": "desc"
            }
          }
        ]
      };
      let searchQueryResponse = await this.esService.searchData(searchQuery);
      if (searchQueryResponse && searchQueryResponse.success) {
        let filterdIds: Array<string> = searchQueryResponse.data.map(filteredData => {
          return filteredData._id
        });

        return {
          success: true,
          filterdIds,
          filterdIdsCount: searchQueryResponse.dataTotal
        };
      }
      return {
        success: false,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
      };
    }
  }

  async viewAllSpecificLeads(
    providerId: string,
    page: string,
    status: ProviderStatus,
  ) {
    try {
      const PAZE_SIZE = 3;
      const currentPage = parseInt(page || '0');
      const leadCount = await getRepository(Lead)
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.providers', 'leadProviders')
        .select('COUNT(lead)', 'lead')
        .where('leadProviders.status=:providerStatus', {
          providerStatus: status,
        })
        .andWhere('leadProviders.providerId=:providerId', { providerId })
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
        .leftJoinAndSelect('lead.providers', 'leadProviders')
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
          'leadBuyer.id',
          'user.id',
          'user.firstName',
          'user.lastName',
          'profile.avatar',
          'leadSkill',
          'category', // filter out category and sub category
          'subCategory',
          'leadDocument.name',
          'leadDocument.documentURL',
          'leadProviders.status',
        ])
        .where('leadProviders.status=:providerStatus', {
          providerStatus: status,
        })
        .andWhere('leadProviders.providerId=:providerId', { providerId })
        .orderBy({ 'lead.createdAt': 'DESC' })
        .take(PAZE_SIZE)
        .skip(PAZE_SIZE * currentPage)
        .getMany();
      allLeads.map((lead: any) => {
        lead.status = lead.providers[0].status;
        lead.buyer = lead.buyer.buyer;
      });
      return {
        leads: allLeads,
        totalPages: Math.ceil(leadCount.lead / PAZE_SIZE),
      };
    } catch (err) {
      saveLogs(
        this.logger,
        `at provider viewing all ${status} lead`,
        err,
        providerId,
      );
      return {
        success: false,
      };
    }
  }

  async providerViewOneLead(providerId: string, leadId: string) {
    try {
      const lead = await this.leadRepository.findOne(
        { id: leadId },
        {
          select: [
            'id',
            'lead_title',
            'lead_description',
            'lead_engagement',
            'payRate',
            'partialPayment',
            'payCurrency',
            'payType',
            'referenceURL',
            'createdAt',
          ],
        },
      );
      const leadProvider = await this.leadProvider.findOne({
        where: [{ lead: leadId, provider: providerId }],
      });

      const leadBuyer = await getRepository(Lead)
        .createQueryBuilder('lead')
        .leftJoinAndSelect('lead.buyer', 'leadBuyer')
        .leftJoinAndSelect('leadBuyer.buyer', 'user')
        .leftJoinAndSelect('user.profile', 'profile')
        .select([
          'lead.id',
          'leadBuyer.status',
          'user.id',
          'user.firstName',
          'user.lastName',
          'profile.avatar',
          'profile.country',
          'profile.verificationStatus',
        ])
        .where('lead.id=:leadId', { leadId })
        .getOne();
      const buyer = leadBuyer.buyer.buyer;
      // Added Buyer Review
      const buyerReview = await this.reviewService.getAverageReview(buyer.id);
      buyer['review'] = buyerReview;
      const leadSkill = await getRepository(LeadSkill)
        .createQueryBuilder('leadSkill')
        .leftJoinAndSelect('leadSkill.category', 'category')
        .leftJoinAndSelect('leadSkill.subCategory', 'subCategory')
        .select(['leadSkill.proficiency', 'subCategory', 'category'])
        .where('leadSkill.leadId=:leadId', { leadId })
        .getMany();
      const leadDocument = await this.leadDocument.find({
        where: [{ lead: leadId }],
        select: ['name', 'documentURL'],
      });
      const appliedLead = await this.leadProvider.findOne({
        where: { lead: leadId, provider: providerId },
      });
      const applied = appliedLead ? appliedLead.status : null;
      const coverLetter = leadProvider ? leadProvider.coverLetter : null;
      const result = {
        ...lead,
        skills: leadSkill,
        documents: leadDocument,
        buyer: buyer,
        applied,
        coverLetter,
        status: leadBuyer.buyer.status,
      };
      return result;
    } catch (err) {
      saveLogs(
        this.logger,
        'at provider viewing one specific lead',
        err,
        providerId,
        leadId,
      );
      return {
        success: false,
      };
    }
  }

  async applyLead(leadId: string, providerId: String, coverLetter: string) {
    try {
      //checking if provider account is verified or not
      const providerProfile = await this.profileRepo.findOne({
        where: [{ user: providerId }],
      });
      if (
        providerProfile.verificationStatus !== profileVerificationEnum.Verified
      ) {
        throw new Error(
          'Your profile is not verified. Only verified provider can apply for the lead.',
        );
      }
      //finding lead and provider account who applied for the lead
      const lead = await this.leadRepository.findOne({ id: leadId });
      const provider = await this.userService.findUserByUserId(providerId);
      const providerStatus = ProviderStatus.Requested;

      const existingProvider = await this.leadProvider.findOne({
        where: [{ lead: leadId, provider: providerId }],
      });
      if (existingProvider) {
        throw new Error('already applied for the lead');
      }

      //adding the provider to leadProviders table with the cover letter
      const leadProvider: LeadProvider = new LeadProvider();
      leadProvider.lead = lead;
      leadProvider.provider = provider;
      leadProvider.status = providerStatus;
      leadProvider.coverLetter = coverLetter;

      //once provider has applied for the lead, changing the buyer lead status from initiated to negotiatiing
      const leadBuyer: LeadBuyer = await this.leadBuyer.findOne({
        where: [{ lead: leadId }],
      });
      leadBuyer.status = BuyerStatus.Negotiating;
      //saving the buyerLead status
      await this.leadBuyer.save(leadBuyer);

      //finding lead Buyer and sending Buyer notification that provider has applied for the lead
      const buyer: LeadBuyer = await this.leadBuyer.findOne({
        where: [{ lead: leadId }],
        relations: ['buyer'],
      });
      const buyerId = buyer.buyer.id;
      const message = `${provider.firstName} ${provider.lastName} has applied for the ${lead.lead_title} lead.`;
      const notification = await this.notificationService.saveNotification(
        buyerId,
        message,
      );
      this.socketService.server.to(buyerId).emit('Notification', notification);

      if (await this.leadProvider.save(leadProvider)) {
        return {
          success: true,
        };
      } else {
        return {
          success: false,
        };
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at provider applying for a specific lead',
        providerId,
        leadId,
      );
      return {
        success: false,
        message: err.message,
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

  // Change the Status of Lead form Buyer Side
  async changeProviderLeadStatus(
    providerId: string,
    leadId: string,
    leadStatus: ProviderStatus,
  ) {
    try {
      const lead = await this.leadRepository.findOne({ id: leadId });
      const leadBuyer = await this.leadBuyer.findOne({
        where: { lead: leadId },
        relations: ['buyer'],
      });
      const leadProvider = await this.leadProvider.findOne({
        where: { lead: leadId, provider: providerId },
        relations: ['provider'],
      });
      //check to see if the provider has applied for the lead
      if (leadProvider && leadProvider.status === ProviderStatus.Active) {
        leadProvider.status = ProviderStatus.Completed;
        await this.leadProvider.save(leadProvider);
        // now sending the notification to lead buyer stating provider has changed the lead status
        const message = `${leadProvider.provider.firstName} ${leadProvider.provider.lastName} has changed the ${lead.lead_title} lead status to ${ProviderStatus.Completed} state .`;
        const buyerId = leadBuyer.buyer.id;
        const notification = await this.notificationService.saveNotification(
          buyerId,
          message,
        );
        this.socketService.server
          .to(buyerId)
          .emit('Notification', notification);
        return {
          success: true,
        };
      } else {
        throw new Error('Not applied for the lead.');
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at provider changing lead status',
        err,
        providerId,
        leadId,
      );
      return {
        success: false,
      };
    }
  }

  async acceptLeadInvite(providerId: string, buyerId: string, leadId: string) {
    try {
      const lead = await this.leadRepository.findOne({ id: leadId });
      //checking if provider is invited for lead
      const leadProvider = await this.leadProvider.findOne({
        where: [{ lead: leadId, provider: providerId }],
        relations: ['provider'],
      });
      if (leadProvider && leadProvider.status === ProviderStatus.Invited) {
        const leadActiveStatus = await this.buyerLeadService.hireProvider(
          buyerId,
          leadId,
          providerId,
        );
        if (leadActiveStatus.success) {
          const message = `${leadProvider.provider.firstName} ${leadProvider.provider.lastName} has accepted the ${lead.lead_title} lead. Lead is now set to Active state.`;
          const notification = await this.notificationService.saveNotification(
            buyerId,
            message,
          );
          this.socketService.server
            .to(buyerId)
            .emit('Notification', notification);
          return {
            success: true,
            message: 'Lead invitation has been accepted',
          };
        }
        return {
          success: false,
          message: leadActiveStatus.message,
        };
      }
      return {
        success: false,
        message: 'Not invited to work on this lead.',
      };
    } catch (err) {
      saveLogs(
        this.logger,
        'at provider accepting a lead invitation',
        err,
        providerId,
        leadId,
      );
      return {
        success: false,
        message: 'Error accepting the lead invitation.',
      };
    }
  }

  async declineLeadInvite(providerId: string, buyerId: string, leadId: string) {
    try {
      //finding lead and lead buyer
      const lead = await this.leadRepository.findOne({ id: leadId });
      const leadBuyer = await this.leadBuyer.findOne({
        where: { lead: leadId },
        relations: ['buyer'],
      });

      //checking if provider is invited for lead
      const leadProvider = await this.leadProvider.findOne({
        where: [{ lead: leadId, provider: providerId }],
        relations: ['provider'],
      });
      if (leadProvider && leadProvider.status === ProviderStatus.Invited) {
        //deleting provider from lead_providers table
        await getConnection()
          .createQueryBuilder()
          .delete()
          .from(LeadProvider)
          .where('providerId=:providerId', { providerId })
          .andWhere('leadId=:leadId', { leadId })
          .execute();

        //sending notification to the lead buyer saying lead invitation was declined
        const message = `${leadProvider.provider.firstName} ${leadProvider.provider.lastName} has declined the invitation to ${lead.lead_title} lead.`;
        const buyerId = leadBuyer.buyer.id;
        const notification = await this.notificationService.saveNotification(
          buyerId,
          message,
        );
        this.socketService.server
          .to(buyerId)
          .emit('Notification', notification);

        return {
          success: true,
          message: 'Lead invitation declined.',
        };
      } else {
        return {
          success: false,
          message: 'Not invited to work on this lead.',
        };
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at provider declining a lead invitation',
        err,
        providerId,
        leadId,
      );
      return {
        success: false,
        message: 'Error declining the lead invitation.',
      };
    }
  }

  async updatePartialPayment(leadId: string, invoiceAmount: number) {
    try {
      const lead = await this.leadRepository.findOne({
        id: leadId,
      });
      lead.partialPayment = Number(lead.partialPayment) + invoiceAmount;
      await this.leadRepository.save(lead);

      return {
        success: true,
        message: 'Partial amount updated successfully!',
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: 'Problem in updating partial amount!',
      };
    }
  }
}
