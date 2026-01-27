import { RateLimitError } from '@/errors';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['RATE_LIMIT_ERROR', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown, retryableErrors: string[]): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }

  if (error instanceof Error) {
    const errorCode = (error as { code?: string }).code;
    if (errorCode && retryableErrors.includes(errorCode)) {
      return true;
    }

    // Check for network-related errors
    if (
      error.message.includes('fetch failed') ||
      error.message.includes('network') ||
      error.message.includes('timeout')
    ) {
      return true;
    }
  }

  return false;
}

function getRetryDelay(
  error: unknown,
  attempt: number,
  options: Required<RetryOptions>
): number {
  // If it's a rate limit error with retryAfter, use that
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter * 1000;
  }

  // Exponential backoff
  const delay = Math.min(
    options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1),
    options.maxDelayMs
  );

  // Add jitter (0-25% of delay)
  const jitter = delay * Math.random() * 0.25;

  return Math.floor(delay + jitter);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts || !isRetryable(error, opts.retryableErrors)) {
        throw error;
      }

      const delay = getRetryDelay(error, attempt, opts);
      console.log(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms:`,
        error instanceof Error ? error.message : 'Unknown error'
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}
