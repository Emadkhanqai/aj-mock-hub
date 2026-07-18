import {
  BadRequestException,
  type INestApplication,
  type ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

function validationDetails(errors: ValidationError[]) {
  return errors.flatMap((error) =>
    Object.values(error.constraints ?? {}).map((message) => ({
      field: error.property,
      message,
    })),
  );
}

export function configureApp(app: INestApplication): void {
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: validationDetails(errors),
        }),
    }),
  );
  app.setGlobalPrefix('api');
}
