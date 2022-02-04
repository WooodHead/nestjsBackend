import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserSubscriptionService } from './user-subscription.service';
import { CreateUserSubscriptionDto } from './dto/create-user-subscription.dto';
import { UpdateUserSubscriptionDto } from './dto/update-user-subscription.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user-subscription')
export class UserSubscriptionController {
  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  @Get('current')
  async currentUserSubscription(@Req() req) {
    const { id } = req.user;
    return this.userSubscriptionService.currentUserSubscription(id);
  }

  @Post('create')
  create(@Body() createUserSubscriptionDto: CreateUserSubscriptionDto) {
    return this.userSubscriptionService.create(createUserSubscriptionDto);
  }

  @Post('renew/:id')
  async renewSubscription(@Param() susbcription, @Body() renewData) {
    return await this.userSubscriptionService.renewSubscription(
      susbcription.id,
      renewData.renewDuration,
    );
  }

  @Get()
  findAll() {
    return this.userSubscriptionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userSubscriptionService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserSubscriptionDto: UpdateUserSubscriptionDto,
  ) {
    return this.userSubscriptionService.update(+id, updateUserSubscriptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userSubscriptionService.remove(+id);
  }
}
