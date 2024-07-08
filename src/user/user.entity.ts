export class User {
  id: string;
  email: string;
  password: string; // hashed password
  outlookSynced?: boolean;
  outlookAccessToken?: string;
  outlookRefreshToken?: string;
  outlookAccessTokenExpiry?: Date;
  outlookRefreshTokenExpiry?: Date;
  webhookSubscriptionExpiry?: Date;
}
