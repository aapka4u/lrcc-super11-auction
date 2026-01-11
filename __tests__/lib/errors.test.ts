import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
  handleError,
  formatErrorResponse,
} from '@/lib/errors';

describe('Error Classes', () => {
  describe('BadRequestError', () => {
    it('has status code 400', () => {
      const error = new BadRequestError('Invalid input');
      expect(error.statusCode).toBe(400);
    });

    it('has correct code', () => {
      const error = new BadRequestError('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('accepts custom code', () => {
      const error = new BadRequestError('Invalid input', 'CUSTOM_CODE');
      expect(error.code).toBe('CUSTOM_CODE');
    });

    it('stores details', () => {
      const error = new BadRequestError('Invalid input', 'BAD_REQUEST', { field: 'name' });
      expect(error.details).toEqual({ field: 'name' });
    });
  });

  describe('UnauthorizedError', () => {
    it('has status code 401', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
    });

    it('has default message', () => {
      const error = new UnauthorizedError();
      expect(error.message).toBe('Authentication required');
    });

    it('accepts custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('ForbiddenError', () => {
    it('has status code 403', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
    });

    it('has default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Access denied');
    });
  });

  describe('NotFoundError', () => {
    it('has status code 404', () => {
      const error = new NotFoundError('Tournament');
      expect(error.statusCode).toBe(404);
    });

    it('formats message with resource', () => {
      const error = new NotFoundError('Tournament');
      expect(error.message).toBe('Tournament not found');
    });

    it('formats message with resource and ID', () => {
      const error = new NotFoundError('Tournament', 'abc123');
      expect(error.message).toBe('Tournament not found: abc123');
    });

    it('stores resource and ID in details', () => {
      const error = new NotFoundError('Tournament', 'abc123');
      expect(error.details).toEqual({ resource: 'Tournament', id: 'abc123' });
    });
  });

  describe('ConflictError', () => {
    it('has status code 409', () => {
      const error = new ConflictError('Already exists');
      expect(error.statusCode).toBe(409);
    });

    it('accepts custom code', () => {
      const error = new ConflictError('Already exists', 'DUPLICATE');
      expect(error.code).toBe('DUPLICATE');
    });
  });

  describe('ValidationError', () => {
    it('has status code 400', () => {
      const error = new ValidationError('Invalid value');
      expect(error.statusCode).toBe(400);
    });

    it('has code VALIDATION_ERROR', () => {
      const error = new ValidationError('Invalid value');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('stores field in details', () => {
      const error = new ValidationError('Invalid value', 'email');
      expect(error.details?.field).toBe('email');
    });
  });

  describe('RateLimitError', () => {
    it('has status code 429', () => {
      const error = new RateLimitError(Date.now() + 60000, 60);
      expect(error.statusCode).toBe(429);
    });

    it('has code RATE_LIMITED', () => {
      const error = new RateLimitError(Date.now() + 60000, 60);
      expect(error.code).toBe('RATE_LIMITED');
    });

    it('stores resetAt and retryAfter in details', () => {
      const resetAt = Date.now() + 60000;
      const error = new RateLimitError(resetAt, 60);
      expect(error.details?.resetAt).toBe(resetAt);
      expect(error.details?.retryAfter).toBe(60);
    });
  });

  describe('InternalError', () => {
    it('has status code 500', () => {
      const error = new InternalError();
      expect(error.statusCode).toBe(500);
    });

    it('has default message', () => {
      const error = new InternalError();
      expect(error.message).toBe('Internal server error');
    });

    it('is not operational', () => {
      const error = new InternalError();
      expect(error.isOperational).toBe(false);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('has status code 503', () => {
      const error = new ServiceUnavailableError('Database');
      expect(error.statusCode).toBe(503);
    });

    it('formats message with service name', () => {
      const error = new ServiceUnavailableError('Database');
      expect(error.message).toBe('Service unavailable: Database');
    });
  });
});

describe('Error Response Formatting', () => {
  describe('formatErrorResponse', () => {
    it('includes error message and code', () => {
      const error = new BadRequestError('Invalid input');
      const response = formatErrorResponse(error);
      expect(response.error).toBe('Invalid input');
      expect(response.code).toBe('BAD_REQUEST');
    });

    it('includes details for client errors', () => {
      const error = new BadRequestError('Invalid', 'BAD', { field: 'name' });
      const response = formatErrorResponse(error);
      expect(response.details).toEqual({ field: 'name' });
    });

    it('excludes details for server errors (security)', () => {
      const error = new InternalError('DB connection failed', { connectionString: 'secret' });
      const response = formatErrorResponse(error);
      expect(response.details).toBeUndefined();
    });

    it('includes requestId when provided', () => {
      const error = new BadRequestError('Invalid');
      const response = formatErrorResponse(error, 'req123');
      expect(response.requestId).toBe('req123');
    });

    it('omits requestId when not provided', () => {
      const error = new BadRequestError('Invalid');
      const response = formatErrorResponse(error);
      expect(response.requestId).toBeUndefined();
    });
  });
});

describe('Error Handler', () => {
  describe('handleError', () => {
    it('handles AppError with correct status', async () => {
      const error = new BadRequestError('Invalid input');
      const response = handleError(error);
      expect(response.status).toBe(400);
    });

    it('formats AppError correctly', async () => {
      const error = new BadRequestError('Invalid input');
      const response = handleError(error);
      const body = await response.json();
      expect(body.error).toBe('Invalid input');
      expect(body.code).toBe('BAD_REQUEST');
    });

    it('handles unknown errors as 500', async () => {
      const error = new Error('Unknown error');
      const response = handleError(error);
      expect(response.status).toBe(500);
    });

    it('returns generic message for unknown errors', async () => {
      const error = new Error('Secret database error');
      const response = handleError(error);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
      expect(body.code).toBe('INTERNAL_ERROR');
    });

    it('includes requestId in response', async () => {
      const error = new BadRequestError('Invalid');
      const response = handleError(error, 'req456');
      const body = await response.json();
      expect(body.requestId).toBe('req456');
    });

    it('handles null error', async () => {
      const response = handleError(null);
      expect(response.status).toBe(500);
    });

    it('handles string error', async () => {
      const response = handleError('Something went wrong');
      expect(response.status).toBe(500);
    });
  });
});
