import { Feature } from './../feature/entities/feature.entity';
import { Subscription } from './entities/subscription.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, getRepository } from 'typeorm';
import { SubscriptionFeature } from './entities/subscriptionFeature.entity';
import { ProfessionalSubscription } from './entities/professionalSubscription.entity';
import { ProfessionalSubscriptionDto } from './dto/create-professional.dto';
import { sendEmail } from 'src/user/util/sendEmail';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionFeature)
    private subscriptionFeatureRepository: Repository<SubscriptionFeature>,
    @InjectRepository(ProfessionalSubscription)
    private professionalSubscription: Repository<ProfessionalSubscription>,
  ) {}

  // this is referenced when registering buyer or provider
  async findOne(id: string) {
    try {
      const subscription = await this.subscriptionRepository.findOne(id);
      if (!subscription) {
        return {
          success: false,
          error: 'No subscription with given id exists!',
        };
      }
      return {
        success: true,
        error: null,
        data: subscription,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in fetching subscription!',
      };
    }
  }

  // this method is referenced when fetching all available subscriptions
  async getBuyerAvailableSubscriptions() {
    try {
      const getSubscriptionInfo = await getRepository(Subscription)
        .createQueryBuilder('subscription')
        // .leftJoinAndSelect('subscription.subscriptionFeature', 'subscriptionFeature')
        // .leftJoinAndSelect('subscriptionFeature.feature', 'feature')
        .select([
          //   'feature.name',
          //   'feature.feature_type',
          //   'feature.description',
          'subscription.duration',
          'subscription.id',
          'subscription.type',
          'subscription.amount',
          'subscription.user_type',
          // 'subscriptionFeature.id'
        ])
        // .where('feature.feature_type = :featureType', { featureType: 'card_features' })
        .andWhere('subscription.user_type = :userType', { userType: 'Buyer' })
        .andWhere('subscription.amount > :amount', { amount: 0 })
        .andWhere('subscription.type IN (:...subscriptionType)', {
          subscriptionType: ['Regular', 'Premium'],
        })
        .orderBy('subscription.duration', 'ASC')
        .getMany();

      return {
        success: true,
        data: getSubscriptionInfo,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: 'Problem in fetching subscription details!',
      };
    }
  }

  // method referenced during amount calculation from buyer subscription but not referenced by
  async getPaymentServiceDetailsBy(subscription_id: string) {
    try {
      const paymentDetails = await this.subscriptionFeatureRepository.find({
        where: {
          subscription: subscription_id,
          key: In(['commission', 'tds', 'service_charge']),
        },
      });
      return paymentDetails;
    } catch (error) {
      return error;
    }
  }

  //professional subscription service api for wp

  async createProfessionalSubscription(
    createProfessionalSubscripitonDto: ProfessionalSubscriptionDto,
  ) {
    try {
      const addProfessionalSubscriptionDetails =
        await this.professionalSubscription.save(
          createProfessionalSubscripitonDto,
        );
      await sendEmail({
        emailType: 'professional_subscription',
        email: createProfessionalSubscripitonDto.email,
        messageBody: {
          name: createProfessionalSubscripitonDto.name,
        },
      });
      await sendEmail({
        emailType: 'sakchha_professional_subscription',
        email: process.env.ADMIN_EMAIL,
        messageBody: {
          name: createProfessionalSubscripitonDto.name,
          email: createProfessionalSubscripitonDto.email,
          organizationName: createProfessionalSubscripitonDto.organizationName,
        },
      });
      return {
        success: true,
        message: 'Your request has been successfully submitted!.',
        data: addProfessionalSubscriptionDetails,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message:
          'We are unable to accept your request. Please try again later!',
        data: error.message,
      };
    }
  }
}
