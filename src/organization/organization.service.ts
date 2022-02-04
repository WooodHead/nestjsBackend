import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { User } from 'src/user/entities/user.entity';
import { saveLogs } from '../util/logger';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { updateOrganizationKey } from './types/update.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private logger: Logger,
  ) {}

  async createNewOrganiation(
    admin: User,
    organizationName: string,
  ): Promise<Organization> {
    try {
      const organization: Organization = this.organizationRepository.create();
      organization.name = organizationName.trim();
      organization.admin = admin;
      return await this.organizationRepository.save(organization);
    } catch (err) {
      saveLogs(
        this.logger,
        'at creating new organization for user',
        err,
        admin.id,
      );
      throw new BadRequestException();
    }
  }

  async updateOrganizationInfo(
    userId: string,
    organizationUpdateInfo: any,
  ): Promise<any> {
    try {
      const organization: Organization = await this.organizationRepository.findOne(
        { where: [{ admin: userId }] },
      );
      updateOrganizationKey.forEach((key) => {
        if (key === 'totalEmployees') {
          organization[key] = parseInt(organizationUpdateInfo[key], 10)
            ? parseInt(organizationUpdateInfo[key], 10)
            : 0;
        }
        if (organizationUpdateInfo[key]) {
          organization[key] = organizationUpdateInfo[key];
        }
      });
      await this.organizationRepository.save(organization);
    } catch (err) {
      saveLogs(this.logger, 'at updating organization info', err, userId);
      throw new BadRequestException();
    }
  }
}
