import { PROFILE_TYPE } from './profileType';
import { USER_TYPE } from './userType';

export class RegisterUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  profileType: PROFILE_TYPE;
  userType: USER_TYPE;
  organization: string;
}
