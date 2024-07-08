import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy } from 'passport-azure-ad-oauth2';
import { EmailService } from '../email/email.service';
import { OutlookService } from './outlook.service';

@Injectable()
export class OauthStrategy extends PassportStrategy(Strategy, 'azure-ad') {
  constructor(
    private readonly outlookService: OutlookService,
    private readonly emailService: EmailService,
  ) {
    super(outlookService.getOAuthConfig());
  }
  authenticate(req, options) {
    const { userId } = req.params;
    if (userId) {
      options.state = encodeURIComponent(userId);
    }
    super.authenticate(req, options);
  }
  async validate(
    request,
    accessToken,
    refreshToken,
    params,
    profile,
    done,
  ): Promise<any> {
    console.log(accessToken);
    console.log(accessToken, refreshToken, params, profile, done);
    try {
      const { state } = request.query;
      let userId;
      if (state) {
        userId = decodeURIComponent(state.toString());
        console.log(userId);
      }
      const user = await this.outlookService.getUserProfile(accessToken);
      //const user = await this.outlookService.validateUser(userProfile);
      if (!user) {
        throw new UnauthorizedException();
      }
      user.outlookAccessToken = accessToken;
      user.outlookRefreshToken = refreshToken;
      await this.outlookService.sync(user);
      return user;
    } catch (error) {
      console.log(error);
      return error;
      // done(error, false);
    }
  }
}
