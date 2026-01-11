import { NextResponse } from 'next/server';

// ============================================
// ERROR CLASSES
// ============================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// 4xx Client Errors
export class BadRequestError extends AppError {
  constructor(message: string, code = 'BAD_REQUEST', details?: Record<string, unknown>) {
    super(message, code, 400, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, code, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = 'FORBIDDEN') {
    super(message, code, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT', details?: Record<string, unknown>) {
    super(message, code, 409, details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...details });
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends AppError {
  constructor(resetAt: number, retryAfter: number) {
    super('Rate limit exceeded', 'RATE_LIMITED', 429, { resetAt, retryAfter });
    this.name = 'RateLimitError';
  }
}

// 5xx Server Errors
export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(message, 'INTERNAL_ERROR', 500, details, false);
    this.name = 'InternalError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string, details?: Record<string, unknown>) {
    super(`Service unavailable: ${service}`, 'SERVICE_UNAVAILABLE', 503, details);
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================
// ERROR RESPONSE FORMATTING
// ============================================

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export function formatErrorResponse(error: AppError, requestId?: string): ErrorResponse {
  const response: ErrorResponse = {
    error: error.message,
    code: error.code,
  };

  // Include details for client errors, but not for server errors (security)
  if (error.statusCode < 500 && error.details) {
    response.details = error.details;
  }

  if (requestId) {
    response.requestId = requestId;
  }

  return response;
}

// ============================================
// ERROR HANDLER
// ============================================

export function handleError(error: unknown, requestId?: string): NextResponse {
  // Known operational errors
  if (error instanceof AppError) {
    if (!error.isOperational) {
      // Log non-operational errors (bugs, unexpected failures)
      console.error('Non-operational error:', error);
    }

    return NextResponse.json(
      formatErrorResponse(error, requestId),
      { status: error.statusCode }
    );
  }

  // Unknown errors - log and return generic response
  console.error('Unexpected error:', error);

  const internalError = new InternalError();
  return NextResponse.json(
    formatErrorResponse(internalError, requestId),
    { status: 500 }
  );
}

// ============================================
// TRY-CATCH WRAPPER
// ============================================

export type AsyncRouteHandler = (
  request: Request,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withErrorHandler(handler: AsyncRouteHandler): AsyncRouteHandler {
  return async (request, context) => {
    const requestId = crypto.randomUUID().slice(0, 8);

    try {
      const response = await handler(request, context);
      response.headers.set('X-Request-ID', requestId);
      return response;
    } catch (error) {
      const errorResponse = handleError(error, requestId);
      errorResponse.headers.set('X-Request-ID', requestId);
      return errorResponse;
    }
  };
}
