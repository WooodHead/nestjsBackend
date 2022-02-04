import { LEAD_ENGAGEMENT } from './../../lead/types/leadEngagement.enum';
import { PAY_TYPE } from './../../lead/types/payType';
import { BuyerStatus } from 'src/lead/utils/buyerStatus';
export interface ElasticSearchLead {
    id: string,
    lead_title: string,
    lead_description: string,
    payType: PAY_TYPE,
    payRate: number,
    payCurrency: string,
    lead_engagement: LEAD_ENGAGEMENT,
    createdAt: string,
    skills: any,
    leadStatus: BuyerStatus
}