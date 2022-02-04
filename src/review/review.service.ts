import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Lead } from 'src/lead/entities/lead.entity';
import { LeadBuyer } from 'src/lead/entities/leadBuyer.entity';
import { LeadProvider } from 'src/lead/entities/leadProvider.entity';
import { User } from 'src/user/entities/user.entity';
import { saveLogs } from 'src/util/logger';
import { getManager, getRepository, Repository } from 'typeorm';
import { Review } from './entity/review.entity';

@Injectable()
export class ReviewService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,
    @InjectRepository(Lead) private leadRepository: Repository<Lead>,
    @InjectRepository(LeadProvider)
    private leadProviderRepository: Repository<LeadProvider>,
    @InjectRepository(LeadBuyer)
    private leadBuyerRepository: Repository<LeadBuyer>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
  ) {}
  async getReviewForLead(userId, leadId) {
    try {
      const user = await this.userRepository.findOne({ id: userId });
      let review;
      if (user.userType === 'Buyer') {
        review = await this.reviewRepository.findOne(
          { lead: leadId },
          { select: ['providerRating', 'providerReview'] },
        );
      } else {
        review = await this.reviewRepository.findOne(
          { lead: leadId },
          { select: ['buyerRating', 'buyerReview'] },
        );
      }
      if (!review) {
        return {
          success: false,
          message: 'No review was given for this lead',
        };
      } else {
        return {
          success: true,
          review,
        };
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at getting review for a lead',
        err,
        userId,
        leadId,
      );
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  async getBuyerReviewForLead(buyerId: string, leadId) {
    try {
      const review = await getRepository(Review)
        .createQueryBuilder('review')
        .select(['review.providerRating', 'review.providerReview'])
        .where('review.leadId = :leadId', { leadId })
        // .andWhere('review.buyerId = :buyerId', { buyerId })
        .getOne();
      console.log(review);
      // const review = await this.reviewRepository.findOne({
      //   where: { lead: leadId },
      //   select: ['providerRating', 'providerReview'],
      // });
      if (!review) {
        return {
          success: false,
          message: 'No review was given for this lead',
        };
      } else {
        return {
          success: true,
          review,
        };
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at getting buyer review for a lead',
        err,
        null,
        leadId,
      );
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  async getAverageReview(userId) {
    try {
      const user = await this.userRepository.findOne({ id: userId });
      let reviews: Review[];
      let totalReviewCount: number = 0;
      if (user.userType === 'Buyer') {
        reviews = await this.reviewRepository.find({
          where: { buyer: userId },
          select: ['buyerRating'],
        });
        if (reviews.length > 0) {
          reviews.map((r) => (totalReviewCount += r.buyerRating));
        }
        return {
          reviewCount: totalReviewCount / reviews.length,
          totalReviews: reviews.length,
        };
      } else {
        reviews = await this.reviewRepository.find({
          where: { provider: userId },
          select: ['providerRating'],
        });
        if (reviews.length > 0) {
          reviews.map((r) => (totalReviewCount += r.providerRating));
        }
        return {
          reviewCount: totalReviewCount / reviews.length,
          totalReviews: reviews.length,
        };
      }
    } catch (err) {
      saveLogs(this.logger, 'at getting average review for user', err, userId);
      return {
        success: false,
        message: 'Something Went Wrong',
      };
    }
  }

  async createReview(userId, leadId, userReview) {
    try {
      // Creating a new lead
      const user = await this.userRepository.findOne({ id: userId });
      const lead = await this.leadRepository.findOne({ id: leadId });
      let review = await this.reviewRepository.findOne({ lead: leadId });
      if (!review) review = new Review();
      // const review = new Review();
      const entityManager = getManager();
      // For buyer
      if (user.userType === 'Buyer') {
        const leadProvider = await entityManager.query(
          `SELECT id, status, "leadId", "providerId" FROM public.lead_provider WHERE "lead_provider"."leadId"='${leadId}'`,
        );
        review.buyer = user;
        review.providerRating = userReview.rating;
        review.providerReview = userReview.message;
        review.provider = leadProvider[0].providerId;
        review.lead = lead;
        // return 'a';
        if (await this.reviewRepository.save(review)) {
          return {
            success: true,
            message: 'Review Created Successfully',
          };
        }
      }
      // For Provider

      if (user.userType === 'Provider') {
        const leadBuyer = await this.leadBuyerRepository.findOne(
          { lead: leadId },
          { relations: ['buyer'] },
        );

        review.provider = user;
        review.buyerRating = userReview.rating;
        review.buyerReview = userReview.message;
        review.buyer = leadBuyer.buyer;
        review.lead = lead;
        if (await this.reviewRepository.save(review)) {
          return {
            success: true,
            message: 'Review Created Successfully',
          };
        }
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at creating a new review for a lead',
        err,
        userId,
        leadId,
      );
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  async updateReview(userId, leadId, userReview) {
    try {
      const user = await this.userRepository.findOne({ id: userId });
      if (user.userType === 'Buyer') {
        const review = await this.reviewRepository.findOne({
          lead: leadId,
          buyer: userId,
        });
        review.providerRating = userReview.rating;
        review.providerReview = userReview.comment;
        await this.reviewRepository.save(review);
        return {
          success: true,
          message: 'Review updated successfully',
        };
      } else {
        const review = await this.reviewRepository.findOne({
          lead: leadId,
          provider: userId,
        });
        review.buyerRating = userReview.rating;
        review.buyerReview = userReview.comment;
        await this.reviewRepository.save(review);
        return {
          success: true,
          message: 'Review updated successfully',
        };
      }
    } catch (err) {
      saveLogs(
        this.logger,
        'at updating review for a lead',
        err,
        userId,
        leadId,
      );
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }
}
