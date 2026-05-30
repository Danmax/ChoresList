export class AuthError extends Error {
  status = 401;

  constructor(message = "Authentication required") {
    super(message);
  }
}

export class ForbiddenError extends AuthError {
  status = 403;

  constructor(message = "You do not have permission to do that") {
    super(message);
  }
}
