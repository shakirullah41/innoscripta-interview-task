import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DatabaseOperationService } from '../database-operation/database-operation.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  GRAPH_URL,
  OAUTH_CONFIG,
  WEBHOOK_EXPIRY,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  FIVE_MINUTES_IN_MILLIS,
} from '../constants';

@Injectable()
export class OutlookService {
  private readonly logger = new Logger(OutlookService.name);

  constructor(
    private readonly configService: ConfigService,
    private databaseOperationService: DatabaseOperationService,
    private userService: UserService,
    @InjectQueue('email-sync') private readonly emailSyncQueue: Queue,
    @InjectQueue('webhook-notifications')
    private readonly webhookNotificationQueue: Queue,
  ) {}

  checkExpiry(expiryDate: Date): boolean {
    if (!expiryDate) return true;
    const currentTime = new Date().getTime();
    const expiryTime = new Date(expiryDate).getTime();
    return expiryTime - currentTime <= FIVE_MINUTES_IN_MILLIS;
  }

  getOAuthConfig() {
    return {
      clientID: this.configService.get<string>('AZURE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('AZURE_CLIENT_SECRET'),
      callbackURL: this.configService.get<string>('AZURE_CALLBACK_URL'),
      authorizationURL: OAUTH_CONFIG.authorizationURL,
      tokenURL: OAUTH_CONFIG.tokenURL,
      scope: OAUTH_CONFIG.scope,
      passReqToCallback: true,
    };
  }

  async getUserProfile(accessToken: string): Promise<any> {
    return await this.fetchFromGraphApi(`${GRAPH_URL}/me`, accessToken);
  }

  async addSyncJob(userId: string, accessToken: string): Promise<void> {
    try {
      await this.emailSyncQueue.add({ userId, accessToken });
      this.logger.log(`Email sync job added for user ID: ${userId}`);
    } catch (error) {
      this.logger.error('Error adding email sync job:', error.message);
      throw new Error('Failed to add email sync job');
    }
  }

  async addWebhookJob(userId: string, notification: any): Promise<void> {
    try {
      await this.webhookNotificationQueue.add({ userId, notification });
      this.logger.log(`Webhook job added for user ID: ${userId}`);
    } catch (error) {
      this.logger.error('Error adding webhook job:', error.message);
      throw new Error('Failed to add webhook job');
    }
  }

  async fetchMailBoxDetails(
    userId: string,
    accessToken: string,
  ): Promise<void> {
    try {
      const mailFolders = await this.fetchFromGraphApi(
        `${GRAPH_URL}/me/mailFolders`,
        accessToken,
      );
      await this.databaseOperationService.bulkInsert(
        `outlook_mailfolders_${userId}`,
        mailFolders.value,
        userId,
      );
      this.logger.log(
        `Mailbox details fetched and stored for user ID: ${userId}`,
      );
    } catch (error) {
      this.logger.error('Error fetching mailbox details:', error.message);
      throw new Error('Failed to fetch mailbox details');
    }
  }

  async refreshAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<string> {
    try {
      const tokenData = await this.fetchToken('refresh_token', refreshToken);
      const { access_token, refresh_token } = tokenData;
      await this.updateOutlookTokens(userId, access_token, refresh_token);
      return access_token;
    } catch (error) {
      this.logger.error('Error refreshing access token:', error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  async fetchAllEmails(userId: string, accessToken: string): Promise<void> {
    try {
      let nextLink = `${GRAPH_URL}/me/messages?$top=100`;
      while (nextLink) {
        const response = await axios.get(nextLink, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'IdType="ImmutableId"',
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
      this.logger.log(`Emails fetched and stored for user ID: ${userId}`);
    } catch (error) {
      this.logger.error('Error fetching all emails:', error.message);
      throw new Error('Failed to fetch all emails');
    }
  }

  async sync(user: User): Promise<void> {
    try {
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

      if (this.checkExpiry(webhookSubscriptionExpiry)) {
        await this.subscribeToMailboxChanges(id, accessToken);
      }

      if (!outlookSynced) {
        await this.fetchMailBoxDetails(id, accessToken);
        await this.addSyncJob(id, accessToken);
      }
    } catch (error) {
      this.logger.error('Error during sync:', error.message);
      throw new Error('Failed to sync');
    }
  }

  async updateOutlookTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    try {
      const outlookTokens = {
        outlookAccessToken: accessToken,
        outlookRefreshToken: refreshToken,
        outlookAccessTokenExpiry: new Date(Date.now() + ACCESS_TOKEN_EXPIRY),
        outlookRefreshTokenExpiry: new Date(Date.now() + REFRESH_TOKEN_EXPIRY),
      };

      await this.databaseOperationService.update(
        'users',
        userId,
        outlookTokens,
      );
      this.logger.log(`Outlook tokens updated for user ID: ${userId}`);
    } catch (error) {
      this.logger.error('Error updating Outlook tokens:', error.message);
      throw new Error('Failed to update Outlook tokens');
    }
  }

  async subscribeToMailboxChanges(
    userId: string,
    accessToken: string,
  ): Promise<void> {
    try {
      const subscription = await axios.post(
        `${GRAPH_URL}/subscriptions`,
        {
          changeType: 'created,updated,deleted',
          notificationUrl: `${this.configService.get<string>('WEBHOOK_URL')}/${userId}`,
          resource: '/me/messages',
          expirationDateTime: new Date(
            Date.now() + WEBHOOK_EXPIRY,
          ).toISOString(),
          clientState: this.configService.get<string>('WEBHOOK_SECRET'),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'IdType="ImmutableId"',
          },
        },
      );

      await this.databaseOperationService.update('users', userId, {
        webhookSubscriptionExpiry: subscription.data.expirationDateTime,
      });
      this.logger.log(
        `Mailbox changes subscription created for user ID: ${userId}`,
      );
    } catch (error) {
      this.logger.error('Error subscribing to mailbox changes:', error.message);
      throw new Error('Failed to subscribe to mailbox changes');
    }
  }

  async handleNotification(userId: string, notification: any): Promise<void> {
    try {
      const { value: notifications } = notification;
      for (const notif of notifications) {
        if (
          notif.clientState !== this.configService.get<string>('WEBHOOK_SECRET')
        )
          continue;

        const {
          outlookAccessToken,
          outlookRefreshToken,
          outlookAccessTokenExpiry,
        } = await this.userService.findById(userId);
        let accessToken = outlookAccessToken;

        if (this.checkExpiry(outlookAccessTokenExpiry)) {
          accessToken = await this.refreshAccessToken(
            userId,
            outlookRefreshToken,
          );
        }

        if (['created', 'updated', 'deleted'].includes(notif.changeType)) {
          const message = await this.fetchMessageDetails(
            notif.resourceData.id,
            accessToken,
          );
          await this.databaseOperationService.upsert(
            `outlook_messages_${userId}`,
            message.id,
            { ...message, userId },
          );
        }
      }
    } catch (error) {
      this.logger.error('Error handling notification:', error.message);
      throw new Error('Failed to handle notification');
    }
  }

  async fetchMessageDetails(
    messageId: string,
    accessToken: string,
  ): Promise<any> {
    return await this.fetchFromGraphApi(
      `${GRAPH_URL}/me/messages/${messageId}`,
      accessToken,
    );
  }

  private async fetchToken(
    grantType: string,
    refreshToken: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        OAUTH_CONFIG.tokenURL,
        new URLSearchParams({
          client_id: this.configService.get<string>('AZURE_CLIENT_ID'),
          client_secret: this.configService.get<string>('AZURE_CLIENT_SECRET'),
          grant_type: grantType,
          refresh_token: refreshToken,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error fetching token:', error.message);
      throw new Error('Failed to fetch token');
    }
  }

  private async fetchFromGraphApi(
    url: string,
    accessToken: string,
  ): Promise<any> {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Prefer: 'IdType="ImmutableId"',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching data from Graph API: ${url}`,
        error.message,
      );
      throw new Error('Failed to fetch data from Graph API');
    }
  }
}
