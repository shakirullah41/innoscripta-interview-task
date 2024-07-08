import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DatabaseOperationService } from '../database-operation/database-operation.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

@Injectable()
export class OutlookService {
  private readonly graphUrl = 'https://graph.microsoft.com/v1.0';
  constructor(
    private readonly configService: ConfigService,
    private databaseOperationService: DatabaseOperationService,
    private userService: UserService,
  ) {}
  checkExpiry(expiryDate: Date): boolean {
    if (!expiryDate) {
      return true;
    }
    expiryDate = new Date(expiryDate);
    const currentTime = new Date();
    const timeRemaining = expiryDate.getTime() - currentTime.getTime();
    const fiveMinutesInMillis = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Check if the expiry time is near (less than 5 minutes) or has passed
    if (timeRemaining <= fiveMinutesInMillis) {
      return true; // about to expire
    }

    return false;
  }
  getOAuthConfig() {
    return {
      clientID: this.configService.get<string>('AZURE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('AZURE_CLIENT_SECRET'),
      callbackURL: this.configService.get<string>('AZURE_CALLBACK_URL'),
      //   tenant: '5d12424e-eb5b-4707-9915-503f96d348b1',
      authorizationURL: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      scope: [
        'openid',
        'User.Read',
        'profile',
        'email',
        'Mail.Read',
        'Mail.ReadBasic',
        'offline_access',
      ],
      passReqToCallback: true,
    };
  }
  async getUserProfile(accessToken: string): Promise<any> {
    const graphUrl = 'https://graph.microsoft.com/v1.0/me';
    const response = await axios.get(graphUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  }

  async fetchMailBoxDetails(userId: string, accessToken: string): Promise<any> {
    const graphUrl = 'https://graph.microsoft.com/v1.0/me/mailFolders';
    const response = await axios.get(graphUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = response.data.value;
    console.log(data);
    await this.databaseOperationService.bulkInsert(
      `mailfolders_${userId}`,
      data,
      userId,
    ); // error
  }

  async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<string> {
    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: this.configService.get<string>('AZURE_CLIENT_ID'),
        client_secret: this.configService.get<string>('AZURE_CLIENT_SECRET'),
        callbackURL: this.configService.get<string>('AZURE_CALLBACK_URL'),
        authorizationURL: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`,
        tokenURL: `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
        scope: [
          'openid',
          'User.Read',
          'profile',
          'email',
          'Mail.Read',
          'Mail.ReadBasic',
          'offline_access',
        ].join(' '),
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    console.log('=======> refresh token', response.data);
    const { access_token, refresh_token, expire_in } = response.data;
    await this.updateOutlookTokens(userId, access_token, refresh_token);

    return access_token;
  }

  async fetchAllEmails(userId: string, accessToken: string): Promise<any[]> {
    let nextLink = `https://graph.microsoft.com/v1.0/me/messages`;

    while (nextLink) {
      const response = await axios.get(nextLink, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      await this.databaseOperationService.bulkInsert(
        `outlook_messages_${userId}`,
        response.data.value,
        userId,
      );
      nextLink = response.data['@odata.nextLink'];
    }
    await this.databaseOperationService.update('users', userId, {
      outlookSynced: true,
    });
    return null;
  }
  async sync(user: User) {
    try {
      // const user = await this.userService.findById(userId);
      const {
        id,
        outlookSynced,
        outlookAccessToken,
        outlookRefreshToken,
        outlookAccessTokenExpiry,
        outlookRefreshTokenExpiry,
        webhookSubscriptionExpiry,
      } = user;
      let accessToken = outlookAccessToken;
      if (
        this.checkExpiry(outlookAccessTokenExpiry) ||
        this.checkExpiry(outlookRefreshTokenExpiry)
      ) {
        accessToken = await this.refreshAccessToken(id, outlookRefreshToken);
      }
      // Create subscription for mailbox changes
      if (this.checkExpiry(webhookSubscriptionExpiry)) {
        await this.subscribeToMailboxChanges(id, accessToken);
      }
      if (!outlookSynced) {
        await this.fetchAllEmails(id, accessToken);
      }
      await this.fetchMailBoxDetails(id, accessToken);
      console.log('called');
    } catch (e) {
      console.log(e);
    }
  }

  async updateOutlookTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const outlookTokens = {
      outlookAccessToken: accessToken,
      outlookRefreshToken: refreshToken,
      outlookAccessTokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour
      outlookRefreshTokenExpiry: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours
    };

    await this.databaseOperationService.update('users', userId, outlookTokens);
  }
  async subscribeToMailboxChanges(userId: string, accessToken: string) {
    const subscriptionUrl = `${this.graphUrl}/subscriptions`;
    const webhookSubscriptionExpiry = new Date(
      Date.now() + 72 * 60 * 60 * 1000, // 72 hours in milliseconds
    ).toISOString();
    const response = await axios.post(
      subscriptionUrl,
      {
        changeType: 'created,updated,deleted',
        notificationUrl: `${this.configService.get<string>('WEBHOOK_URL')}/${userId}`,
        resource: '/me/messages',
        expirationDateTime: webhookSubscriptionExpiry, // 72 hours in milliseconds
        clientState: this.configService.get<string>('WEBHOOK_SECRET'), // Optional client state value
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const subscription = response.data;
    await this.databaseOperationService.update('users', userId, {
      webhookSubscriptionExpiry,
    });
    return subscription;
  }
  async handleNotification(notification: any, userId: string) {
    const { value: notifications } = notification;
    console.log(notification);
    for (const notif of notifications) {
      const { clientState, resourceData, changeType } = notif;
      if (clientState !== this.configService.get<string>('WEBHOOK_SECRET')) {
        // Invalid client state, ignore the notification
        throw new UnauthorizedException();
        break;
      }
      const { outlookAccessToken } = await this.userService.findById(userId);
      // Fetch detailed message data
      if (
        changeType === 'created' ||
        changeType === 'updated' ||
        changeType === 'deleted'
      ) {
        const message = await this.fetchMessageDetails(
          resourceData.id,
          outlookAccessToken,
        );
        // Process the message, e.g., save it to your database i.e Elasticsearch
        await this.databaseOperationService.upsert(
          `outlook_messages_${userId}`,
          message.id,
          { ...message, userId },
        );
        return null;
      }
    }
  }
  async fetchMessageDetails(
    messageId: string,
    accessToken: string,
  ): Promise<any> {
    const url = `${this.graphUrl}/me/messages/${messageId}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }
}
