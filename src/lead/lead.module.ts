import { Elasticsearch } from './../elasticsearch/entities/elasticsearch.entity';
import { ElasticsearchModule } from './../elasticsearch/elasticsearch.module';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { SkillModule } from 'src/skill/skill.module';
import { UserModule } from 'src/user/user.module';
import { BuyerLeadService } from './lead.buyer.service';
import { Lead } from './entities/lead.entity';
import { LeadDocument } from './entities/leadDocument.entity';
import { LeadProvider } from './entities/leadProvider.entity';
import { LeadSkill } from './entities/leadSkill.entity';
import { LeadBuyer } from './entities/leadBuyer.entity';
import { ProviderLeadController } from './lead.provider.controller';
import { ProviderLeadService } from './lead.provider.service';
import { SaveDocuments } from './saveDocument.service';
import { BuyerLeadController } from './lead.buyer.controller';
import { User } from 'src/user/entities/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { AuthService } from 'src/auth/auth.service';
import { WebsocketModule } from 'src/websocket/websocket.module';
import { WebSocketService } from 'src/websocket/websocket.service';
import { ReviewModule } from 'src/review/review.module';
import { ProfileModule } from 'src/profile/profile.module';
import { Profile } from 'src/profile/entities/profile.entity';
import { UserSkill } from 'src/profile/entities/user-skill.entity';
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadDocument,
      LeadSkill,
      LeadProvider,
      LeadBuyer,
      User,
      Profile,
      UserSkill,
    ]),
    UserModule,
    SkillModule,
    ElasticsearchModule,
    WebsocketModule, // For Lead Notifications
    NotificationModule, // For saving leads notification
    forwardRef(() => ReviewModule),
    UserSubscriptionModule,
  ],
  controllers: [ProviderLeadController, BuyerLeadController],
  providers: [ProviderLeadService, SaveDocuments, BuyerLeadService],
  exports: [TypeOrmModule, ProviderLeadService],
})
export class LeadModule {}
