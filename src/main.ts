import 'isomorphic-fetch';
import { ReadableStream } from 'web-streams-polyfill';
global.ReadableStream = ReadableStream;
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
