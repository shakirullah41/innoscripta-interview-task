export const GRAPH_URL = 'https://graph.microsoft.com/v1.0';
export const OAUTH_CONFIG = {
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
};
export const WEBHOOK_EXPIRY = 72 * 60 * 60 * 1000; // 72 hours
export const ACCESS_TOKEN_EXPIRY = 3600 * 1000; // 1 hour
export const REFRESH_TOKEN_EXPIRY = 90 * 24 * 3600 * 1000; // 90 days
export const FIVE_MINUTES_IN_MILLIS = 5 * 60 * 1000;
