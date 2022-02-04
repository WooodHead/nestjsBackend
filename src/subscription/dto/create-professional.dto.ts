import { IsEmail, MaxLength, MinLength } from 'class-validator';

export class ProfessionalSubscriptionDto {
  name: string;

  organizationName: string;

  address: string;

  @MaxLength(15)
  @MinLength(5)
  contactNumber: string;

  @IsEmail()
  email: string;

  companyWebsite: string;

  comment: string;
}
