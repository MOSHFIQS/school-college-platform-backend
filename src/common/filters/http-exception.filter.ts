import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();
    const req  = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error   = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse() as any;
      message = typeof r === 'string' ? r : r.message ?? exception.message;
      error   = typeof r === 'object' ? (r.error ?? 'Error') : exception.message;
    } else if ((exception as any)?.code === 'P2002') {
      status  = HttpStatus.CONFLICT;
      const fields = (exception as any).meta?.target?.join(', ');
      message = `A record with this ${fields} already exists`;
      error   = 'Conflict';
    } else if ((exception as any)?.code === 'P2025') {
      status  = HttpStatus.NOT_FOUND;
      message = 'Record not found';
      error   = 'Not Found';
    } else {
      this.logger.error((exception as any)?.message, (exception as any)?.stack);
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
