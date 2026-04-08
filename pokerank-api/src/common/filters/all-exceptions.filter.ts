import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, unknown>;
        message = (obj['message'] as string | string[]) ?? exception.message;
        code = obj['code'] as string | undefined;
      } else {
        message = exception.message;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).send({
      success: false,
      error: {
        statusCode: status,
        message,
        ...(code && { code }),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
