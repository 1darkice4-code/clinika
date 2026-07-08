import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Некорректные данные") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Требуется вход") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Недостаточно прав") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Сущность не найдена") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Конфликт данных") {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Слишком много запросов") {
    super(message, 429, "RATE_LIMITED");
  }
}

export function toPublicError(error: unknown): { status: number; body: { error: string; code: string } } {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: error.issues[0]?.message ?? "Некорректные данные",
        code: "VALIDATION_ERROR"
      }
    };
  }

  if (error instanceof AppError) {
    return { status: error.statusCode, body: { error: error.message, code: error.code } };
  }

  return {
    status: 500,
    body: {
      error: "Не удалось обработать запрос. Попробуйте позже.",
      code: "INTERNAL_ERROR"
    }
  };
}
