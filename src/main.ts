import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { WinstonModule, WINSTON_MODULE_PROVIDER } from 'nest-winston';
import * as Sentry from '@sentry/node';
import * as helmet from 'helmet';
import * as nocache from 'nocache';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    cors: {
      credentials: true,
      origin: process.env.ORIGIN,
    },
  });
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(helmet.xssFilter());
  app.use(helmet.hidePoweredBy());
  app.use(nocache());
  app.useLogger(app.get(WINSTON_MODULE_PROVIDER));
  app.useGlobalPipes(new ValidationPipe());
  Sentry.init({
    dsn: 'https://bf1cad50a6bd4d579bbdf82733c61998@o945317.ingest.sentry.io/5893945',
  });
  await app.listen(4000);
}
bootstrap();
