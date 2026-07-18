/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'worker';
  app.setGlobalPrefix(globalPrefix);
  const port = Number(process.env.WORKER_PORT ?? 3001);
  await app.listen(port, '127.0.0.1');
  Logger.log(
    `AJ Mock Hub worker ready at http://127.0.0.1:${port}/${globalPrefix}/health`,
  );
}

bootstrap();
