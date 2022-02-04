import { SocialMediaProperties } from './socialMediaProperties';

export class ProfileUpdateDto {
  firstName: string;
  lastName: string;
  organization?: string;
  identityNumber?: number;
  dob: string;
  jobTitle: string;
  bio: string;
  mobile: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  payType: string;
  payRate: string;
  payCurrency: string;
  engagementType: string;
  totalEmployees?: number;
  name?: string; // Organization Name
}

export const basicProfileUpdateKey = [
  'jobTitle',
  'bio',
  'dob',
  'mobile',
  'address1',
  'address2',
  'city',
  'state',
  'zip',
  'country',
  'payRate',
  'payType',
  'engagement',
  'payCurrency',
];
