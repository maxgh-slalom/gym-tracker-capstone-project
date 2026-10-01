/** Error types shared by every layer. `statusCode` and `code` are what the error middleware maps. */

export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', field = null } = {}) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
  }
}

export class ValidationError extends AppError {
  constructor(message, field) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', field });
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message, field = null) {
    super(message, { statusCode: 409, code: 'CONFLICT', field });
  }
}
