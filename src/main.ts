import * as morgan from 'morgan';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    morgan(
      ':remote-addr :user-agent - :remote-user [:date[web]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms',
    ),
  );
  // swagger setup
  const config = new DocumentBuilder()
    .setTitle('Api Documentation')
    .setDescription('Banking Mobile Application API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'accessToken',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('apidoc', app, document, {
    swaggerOptions: { defaultModelsExpandDepth: -1 },
  });
  await app.listen(3000);
}
bootstrap();
