export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'validation_error', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Missing or invalid token') {
    super(401, 'unauthorized', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'not_found', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'conflict', message);
  }
}

export class NotImplementedError extends AppError {
  constructor(what: string) {
    super(501, 'not_implemented', `${what} is not implemented yet`);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super(503, 'auth_unavailable', message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string) {
    super(429, 'too_many_requests', message);
  }
}
