import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface RequestUser {
  id: number;
  email: string;
  name: string | null;
}

interface RequestWithUser extends Request {
  user?: RequestUser;
}

/**
 * Global HTTP exception filter
 * Formats error responses consistently and handles custom status codes
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithUser>();

    // Get status code (including custom 498)
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract error details
    const errorResponse =
      typeof exceptionResponse === 'object'
        ? exceptionResponse
        : { message: exceptionResponse };

    // Format consistent error response
    const formattedResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof errorResponse === 'object' && errorResponse),
    };

    // Log error for monitoring
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        JSON.stringify(formattedResponse),
      );
    } else if (status === 498) {
      // Log token expiration for security monitoring
      const userId = request.user?.id ?? 'unknown';
      this.logger.warn(
        `Token expired: ${request.method} ${request.url} - User: ${userId}`,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url}`,
        JSON.stringify(formattedResponse),
      );
    }

    // Send response with appropriate status code
    response.status(status).json(formattedResponse);
  }
}
