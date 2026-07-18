import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  it('wraps expected errors without exposing internals', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new ApiExceptionFilter().catch(
      new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found.',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found.',
      },
    });
  });
});
