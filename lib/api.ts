import { NextRequest, NextResponse } from "next/server";
import { parentSession, verifySessionToken, type SessionPayload } from "@/lib/session";

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>;

export function withErrors(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const authResponse = authErrorResponse(error);
      if (authResponse) return authResponse;

      const message = error instanceof Error ? error.message : String(error);
      console.error(`[API] ${req.method} ${req.nextUrl?.pathname ?? req.url} →`, message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export class AuthError extends Error {
  status = 401;

  constructor(message = "Authentication required") {
    super(message);
  }
}

export function requireSession(req: NextRequest): SessionPayload {
  const session = verifySessionToken(req.cookies.get(parentSession.name)?.value);
  if (!session) throw new AuthError();
  return session;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
