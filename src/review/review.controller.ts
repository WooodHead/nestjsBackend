import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SentryInterceptor } from 'src/sentry.interceptor';
import { ReviewService } from './review.service';

@UseGuards(JwtAuthGuard)
@UseInterceptors(SentryInterceptor)
@Controller('lead/review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}
  /*
    
     - Route for viewing lead review
     - Route for updating lead review
     - Route for getting total review count and average for users
     - Route for getting review for particular lead from particular user respective    
    */

  @Get('/my-review')
  async getReview(@Req() req) {
    return await this.reviewService.getAverageReview(req.user.id);
  }

  @Get('/:leadId')
  async getReviewForLead(@Req() req, @Param() { leadId }) {
    return await this.reviewService.getReviewForLead(req.user.id, leadId);
  }

  @Post('/add/:leadId')
  async insertReviewForLead(
    @Req() req,
    @Param() { leadId },
    @Body() reviewDetails,
  ) {
    // return 'as';
    return await this.reviewService.createReview(
      req.user.id,
      leadId,
      reviewDetails,
    );
  }

  @Put('')
  async updateReviewForLead() {}

  @Get()
  async getReviewCountAndAverage() {}
}
