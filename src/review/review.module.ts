import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from 'src/lead/entities/lead.entity';
import { LeadBuyer } from 'src/lead/entities/leadBuyer.entity';
import { LeadProvider } from 'src/lead/entities/leadProvider.entity';
import { LeadModule } from 'src/lead/lead.module';
import { Review } from './entity/review.entity';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Review, LeadProvider, LeadBuyer]),
    LeadModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
