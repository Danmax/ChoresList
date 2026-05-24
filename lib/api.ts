import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>;

export function withErrors(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[API] ${req.method} ${req.nextUrl?.pathname ?? req.url} →`, message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
