export class ForgotPasswordResponse {
  success: boolean;
  resetEmail?: string;
  error?: string;
}

export class VerifyResetToken {
  verified: boolean;
  error?: string;
}
