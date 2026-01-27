export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ShopifyAuthError extends AppError {
  constructor(message: string) {
    super(message, 401, 'SHOPIFY_AUTH_ERROR');
  }
}

export class ShopifyApiError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'SHOPIFY_API_ERROR');
  }
}

export class WebhookVerificationError extends AppError {
  constructor(message: string = 'Invalid webhook signature') {
    super(message, 401, 'WEBHOOK_VERIFICATION_ERROR');
  }
}

export class ScrapingError extends AppError {
  constructor(message: string, url?: string) {
    super(
      url ? `Failed to scrape ${url}: ${message}` : message,
      400,
      'SCRAPING_ERROR'
    );
  }
}

export class AIGenerationError extends AppError {
  constructor(message: string) {
    super(message, 500, 'AI_GENERATION_ERROR');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

export class EncryptionError extends AppError {
  constructor(message: string) {
    super(message, 500, 'ENCRYPTION_ERROR');
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function formatErrorResponse(error: unknown): {
  error: string;
  code: string;
  statusCode: number;
} {
  if (isAppError(error)) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
}
