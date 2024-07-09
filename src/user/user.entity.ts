import { Exclude } from 'class-transformer';

export class User {
  id: string;
  email: string;
  @Exclude()
  password?: string; // hashed password
  outlookSynced?: boolean;
  outlookAccessToken?: string;
  outlookRefreshToken?: string;
  outlookAccessTokenExpiry?: Date;
  outlookRefreshTokenExpiry?: Date;
  webhookSubscriptionExpiry?: Date;
}
