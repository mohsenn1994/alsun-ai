import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export interface FieldError {
  path: string;
  message: string;
}

/**
 * Base class for errors the API maps to a specific HTTP status. Services throw
 * these (they never touch `reply`), and the central handler renders them. An
 * optional `details` array carries field-level errors (same shape as ZodError).
 */
export class AppError extends Error {
  statusCode: number;
  details?: FieldError[];
  constructor(statusCode: number, message: string, details?: FieldError[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large') {
    super(413, message);
    this.name = 'PayloadTooLargeError';
  }
}

/** 400 carrying per-field details (used by the submission validation gate). */
export class ValidationError extends AppError {
  constructor(details: FieldError[], message = 'Validation failed') {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Single central error handler so every failure has a consistent JSON shape:
 *   - ZodError → 400 { error, details }            (body/params validation)
 *   - AppError → its statusCode { error[, details] } (domain errors from services)
 *   - else     → statusCode (e.g. multipart 413) or 500 (logged, message hidden)
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(
        error.details ? { error: error.message, details: error.details } : { error: error.message },
      );
    }
    const status = error.statusCode ?? 500;
    if (status >= 500) app.log.error(error);
    return reply.code(status).send({
      error: status >= 500 ? 'Internal Server Error' : error.message,
    });
  });
}
