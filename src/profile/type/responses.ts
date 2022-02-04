import { Error } from 'src/user/type/userResponse';

export class ProfileUpdateResponse {
  success: boolean;
  message?: string;
  error?: [Error];
}

export class AvatarUpdateResponse {
  success: boolean;
  avatarURL?: string;
  error?: string;
}

export class AvatarDeleteResponse {
  success: boolean;
  avatarURL?: string;
  message?: string;
  error?: string;
}
export class DocumentUpdateResponse {
  success: boolean;
  key?: string;
  error?: string;
}
