import { User } from '../entities/user.entity';

export class Error {
  field?: string;
  message?: string;
}

export class UserResponse {
  success: boolean;
  data?: User;
  error?: [Error];
}
