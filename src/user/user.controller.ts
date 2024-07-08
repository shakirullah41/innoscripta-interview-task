// src/user/user.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { SignUpDto } from '../auth/dto/signup.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  async createUser(@Body() signUpDto: SignUpDto) {
    await this.userService.createUser(signUpDto);
    return { message: 'User created successfully' };
  }
}
