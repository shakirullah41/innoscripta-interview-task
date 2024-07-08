// src/user/user.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';
import { SignUpDto } from '../auth/dto/signup.dto';
import { DatabaseOperationService } from '../database-operation/database-operation.service';
@Injectable()
export class UserService {
  constructor(
    private readonly databaseOperationService: DatabaseOperationService,
  ) {}

  async createUser(signUpDto: SignUpDto): Promise<User> {
    const { email, password } = signUpDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuidv4(),
      email,
      password: hashedPassword,
    };
    await this.databaseOperationService.insert('users', user);
    return user;
  }
  async signUp(SignUpDto: SignUpDto) {
    const { email } = SignUpDto;
    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      throw new BadRequestException({ message: 'Email already exists' });
    }
    return this.createUser(SignUpDto);
  }
  async findUserByEmail(email: string): Promise<User> {
    const query = {
      match: { email },
    };
    const [user] = await this.databaseOperationService.search('users', query);
    return user;
  }
  async findById(userId: string): Promise<User> {
    return this.databaseOperationService.findById('users', userId);
  }
  async validateUserPassword(email: string, password: string): Promise<User> {
    const user = await this.findUserByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }
  async updateTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ) {
    return this.databaseOperationService.update('users', userId, {
      accessToken,
      refreshToken,
    });
  }
}
