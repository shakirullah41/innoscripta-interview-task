import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../../user/user.entity';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
@Injectable() // to make it injectable so other modules can use it
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
    private authService: AuthService,
  ) {
    super({
      // super used to call the constructor of base/parent class
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // used to extract token from req header automatically
      secretOrKey: configService.get('JWT_SECRET'), //config
    });
  }
  // this function is must and at this point token is already verified.
  async validate(payload): Promise<User> {
    const { email } = payload;

    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
