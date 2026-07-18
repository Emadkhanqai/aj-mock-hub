/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port, '127.0.0.1');
  Logger.log(
    `AJ Mock Hub API ready at http://127.0.0.1:${port}/${globalPrefix}/health`,
  );
}

bootstrap();
