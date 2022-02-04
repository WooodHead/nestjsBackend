import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Organization } from '../organization/entities/organization.entity';
import { jwtConstants } from '../auth/constants/secret';
import { OrganizationModule } from 'src/organization/organization.module';
import { UserSubscriptionModule } from 'src/user-subscription/user-subscription.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { Subscription } from 'src/subscription/entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization,Subscription]),
    JwtModule.register({ secret: jwtConstants.secret }),
    OrganizationModule,
    UserSubscriptionModule
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [TypeOrmModule, UserService],
})
export class UserModule {}
