import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exception for expired JWT tokens
 * Uses HTTP 498 status code to match frontend error handling
 */
export class TokenExpiredException extends HttpException {
  constructor(message = 'Token expired') {
    super(
      {
        statusCode: 498,
        message,
        error: 'Token Expired',
      },
      498 as HttpStatus,
    );
  }
}
