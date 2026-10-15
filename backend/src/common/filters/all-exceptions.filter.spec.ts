import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  function createHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = { method: 'GET', url: '/api/v1/health' };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  }

  it('maps HttpException to a stable error body', () => {
    const { host, status, json } = createHost();

    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'Not found',
      },
    });
  });

  it('hides internal exception details from clients', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new Error('relation "User" does not exist at Connection.prisma'),
      host,
    );

    const safeBody = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    };

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(safeBody);
    expect(JSON.stringify(safeBody)).not.toContain('relation');
    expect(JSON.stringify(safeBody)).not.toContain('prisma');
  });
});
