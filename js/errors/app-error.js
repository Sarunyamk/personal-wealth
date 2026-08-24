export const ERROR_CODES = Object.freeze({
  AUTH: "AUTH_ERROR",
  CONFLICT: "CONFLICT",
  NOT_FOUND: "NOT_FOUND",
  STORAGE: "STORAGE_ERROR",
  UNSUPPORTED_SCHEMA: "UNSUPPORTED_SCHEMA",
  VALIDATION: "VALIDATION_ERROR",
});

export class AppError extends Error {
  constructor(code, message, { cause, details = [] } = {}) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.details = Object.freeze([...details]);
  }
}

export function validationError(details) {
  return new AppError(ERROR_CODES.VALIDATION, "The submitted data is invalid.", { details });
}
