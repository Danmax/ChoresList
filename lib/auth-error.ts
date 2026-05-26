export class AuthError extends Error {
  status = 401;

  constructor(message = "Authentication required") {
    super(message);
  }
}
