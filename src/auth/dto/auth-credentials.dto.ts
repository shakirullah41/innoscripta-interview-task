import { IsString, IsEmail } from 'class-validator';

export class AuthCredentialsDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsString()
  password: string;
}
