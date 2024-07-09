import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Strategy } from 'passport-azure-ad-oauth2';
import { OutlookService } from './outlook.service';

@Injectable()
export class OauthStrategy extends PassportStrategy(Strategy, 'azure-ad') {
  constructor(private readonly outlookService: OutlookService) {
    super(outlookService.getOAuthConfig());
  }
  authenticate(req, options) {
    const { userId } = req.params;
    if (userId) {
      options.state = encodeURIComponent(userId);
    }
    super.authenticate(req, options);
  }
  async validate(request, accessToken, refreshToken): Promise<any> {
    try {
      const { state } = request.query;
      let userId;
      if (state) {
        userId = decodeURIComponent(state.toString());
      }
      await this.outlookService.updateOutlookTokens(
        userId,
        accessToken,
        refreshToken,
      );
      const user = await this.outlookService.getUserProfile(accessToken);
      if (!user) {
        throw new UnauthorizedException();
      }
      await this.outlookService.sync(user);
      return user;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException({
        error: 'Something went wrong, please try again later.',
      });
    }
  }
}
