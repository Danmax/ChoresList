import { NextRequest, NextResponse } from "next/server";
import { AuthError, ForbiddenError } from "@/lib/auth-error";
import { parentSession, verifySessionToken, type SessionPayload } from "@/lib/session";
import { ElevationRequiredError, requireElevation } from "@/lib/elevation";
import { prisma } from "@/lib/prisma";

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

export function optionalSession(req: NextRequest): SessionPayload | null {
  return verifySessionToken(req.cookies.get(parentSession.name)?.value);
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

export async function requireOwnerSession(req: NextRequest): Promise<SessionPayload> {
  const session = await requireParentSession(req);
  const parent = await prisma.parentAccount.findFirst({
    where: { id: session.parentId, householdId: session.householdId },
    select: { accountRole: true },
  });
  if (!parent || parent.accountRole !== "owner") {
    throw new ForbiddenError("Only the household owner can do that");
  }
  return session;
}
