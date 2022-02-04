import { LeadSkill } from "src/lead/entities/leadSkill.entity";
import { LeadEngagementEnum } from "src/lead/types/leadEngagement.enum";
import { Lead_Status_Type } from "src/lead/types/leadStatus";
import { PAY_TYPE } from "src/lead/types/payType";

export class CreateElasticsearchDto {
    id: string;
    lead_title: string;
    lead_description: string;
    payType: PAY_TYPE;
    payRate: number;
    payCurrency: string;
    skills: LeadSkill[];
    engagement: LeadEngagementEnum;
    createdAt: string;
    leadStatus: Lead_Status_Type ;
}
