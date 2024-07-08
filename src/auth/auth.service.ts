import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/signup.dto';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { OutlookService } from '../outlook/outlook.service';
import { User } from '../user/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private outlookService: OutlookService,
  ) {}

  async login(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<{ accessToken: string }> {
    const { email, password } = authCredentialsDto;
    const user = await this.userService.validateUserPassword(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { id } = user;
    const accessToken = await this.generateToken({ id, email });
    return { accessToken };
  }
  async generateToken(data) {
    const payload = { ...data };
    const accessToken = await this.jwtService.sign(payload);
    return accessToken;
  }
  async signUp(signUpDto: SignUpDto) {
    return this.userService.signUp(signUpDto);
  }
  sync(user: User) {
    return this.outlookService.sync(user);
  }
}
