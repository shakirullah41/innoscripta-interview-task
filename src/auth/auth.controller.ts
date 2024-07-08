import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { SignUpDto } from './dto/signup.dto';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { Public } from './decorator/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Get('outlook-oauth/:userId')
  @UseGuards(AuthGuard('azure-ad'))
  async oAuth() {
    // Redirects to the Microsoft login page
  }

  @Public()
  @Get('outlook-oauth-redirect')
  @UseGuards(AuthGuard('azure-ad'))
  async redirect(@Res() res, @Req() req) {
    await this.authService.sync(req.user);
    res.redirect('/'); // Redirect to the front dashboard
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() authCredentialsDto: AuthCredentialsDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.login(authCredentialsDto);
  }
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }

  @Public()
  @Post('signup')
  async signUp(
    @Body(ValidationPipe) signUpDto: SignUpDto,
    @Res() res: Response,
  ) {
    const user = await this.authService.signUp(signUpDto);
    return res.status(HttpStatus.CREATED).json(user);
  }
}
