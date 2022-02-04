import { Test, TestingModule } from '@nestjs/testing';
import { ProviderLeadController } from './lead.provider.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProviderLeadService } from './lead.provider.service';
import { SaveDocuments } from './saveDocument.service';
import { RolesGuard } from '../auth/roles.guard';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeadDocument } from './entities/leadDocument.entity';
import { UserModule } from '../user/user.module';
import { User } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { Lead } from './entities/lead.entity';
import { LeadSkill } from './entities/leadSkill.entity';
import { Organization } from '../organization/entities/organization.entity';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants/secret';
import { LeadDto } from './types/lead.dto';

describe('LeadController', () => {
  // let controller: LeadController;

  const reqmock = ({
    user: {
      id: '123',
    },
  } as any) as Request;

  const leadDto: LeadDto = {
    lead_title: 'new Lead',
    lead_description: 'Hello lead',
    payType: 'Hourly',
    payRate: 10,
    payCurrency: 'USD',
    skills: [
      {
        category: '123',
        subCategory: '123',
        proficiency: {
          name: 'Expert',
        },
      },
    ],
  };
  const mockLeadService = {
    createLead: jest.fn((buyerId, leadDto, files) => {
      return {
        id: `1-${Date.now()}`,
        ...leadDto,
      };
    }),
    viewAllLeads: jest.fn((id) => {
      return [
        {
          id: id,
          ...leadDto,
        },
      ];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtConstants.secret })],
      // controllers: [LeadController],
      providers: [
        UserService,
        // LeadService,
        SaveDocuments,
        {
          provide: getRepositoryToken(Lead),
          useValue: {},
        },
        {
          provide: getRepositoryToken(LeadSkill),
          useValue: {},
        },
        {
          provide: getRepositoryToken(LeadDocument),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {},
        },
      ],
    })
      // .overrideProvider(LeadService)
      // .useValue(mockLeadService)
      .compile();

    // controller = module.get<LeadController>(LeadController);
  });

  it('should be defined', () => {
    // expect(controller).toBeDefined();
  });

  it('should create a lead', () => {
    // expect(controller.createLead(reqmock, leadDto, [])).toEqual({
    //   id: expect.any(String),
    //   ...leadDto,
    // });
    expect(mockLeadService.createLead).toHaveBeenCalled();
  });

  it('should view all leads', () => {
    // expect(controller.viewAllLeads(reqmock)).toEqual([
    //   {
    //     id: expect.any(String),
    //     ...leadDto,
    //   },
    // ]);
  });
});
