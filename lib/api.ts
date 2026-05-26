import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "@/lib/auth-error";
import { parentSession, verifySessionToken, type SessionPayload } from "@/lib/session";
import { ElevationRequiredError, requireElevation } from "@/lib/elevation";

export { AuthError };

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>;

export function withErrors(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const authResponse = authErrorResponse(error);
      if (authResponse) return authResponse;

      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("does not exist in the current database") || message.includes("doesn't exist")) {
        return NextResponse.json(
          { error: "Database migrations are missing. Run `npm run db:deploy` on the production database, then restart the app." },
          { status: 500 }
        );
      }
      console.error(`[API] ${req.method} ${req.nextUrl?.pathname ?? req.url} →`, message);
      const clientError = process.env.NODE_ENV === "production" ? "Something went wrong" : message;
      return NextResponse.json({ error: clientError }, { status: 500 });
    }
  };
}

export function requireSession(req: NextRequest): SessionPayload {
  const session = verifySessionToken(req.cookies.get(parentSession.name)?.value);
  if (!session) throw new AuthError();
  return session;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof ElevationRequiredError) {
    return NextResponse.json(
      { error: error.message, needsPin: true, hasPin: error.hasPin },
      { status: error.status }
    );
  }
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

export async function requireParentSession(req: NextRequest): Promise<SessionPayload> {
  const session = requireSession(req);
  await requireElevation(req, session.parentId, session.householdId);
  return session;
}
