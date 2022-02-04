import { LeadEngagementEnum } from './leadEngagement.enum';
import { PAY_TYPE } from './payType';
import { SKILL_PROFICIENCY_TYPE } from './skillProficiency';

class LeadSkill {
  category: string;
  subCategory: string;
  proficiency: {
    name: SKILL_PROFICIENCY_TYPE;
  };
}

export class LeadDto {
  lead_title: string;
  lead_description: string;
  payType: PAY_TYPE;
  payRate: number;
  payCurrency: string;
  skills: LeadSkill[];
  engagement: LeadEngagementEnum;
  referenceURL?: string;
}
