import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireParentSession, withErrors } from "@/lib/api";
import { childAccessWhere } from "@/lib/child-access";
import { COLORING_SCENES } from "@/lib/coloring";
import { accessibleMember, gameActor } from "@/lib/game-access";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MAX_BODY = 6_000_000;
const PAGE_SIZE = 12;

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const memberAccess = await childAccessWhere(parentId, householdId);
  const cursor = req.nextUrl.searchParams.get("cursor");
  const where = { householdId, member: memberAccess };
  const previous = cursor ? await prisma.coloringPost.findFirst({ where: { ...where, id: cursor }, select: { id: true, createdAt: true } }) : null;
  if (cursor && !previous) return NextResponse.json({ error: "Feed position not found" }, { status: 400 });
  const posts = await prisma.coloringPost.findMany({
    where: { ...where, ...(previous ? { OR: [{ createdAt: { lt: previous.createdAt } }, { createdAt: previous.createdAt, id: { lt: previous.id } }] } : {}) },
    select: { id: true, title: true, sceneId: true, createdAt: true, member: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: PAGE_SIZE + 1,
  });
  const page = posts.slice(0, PAGE_SIZE);
  return NextResponse.json({ posts: page, nextCursor: posts.length > PAGE_SIZE ? page.at(-1)!.id : null }, { headers: { "Cache-Control": "private, no-store" } });
});

export const POST = withErrors(async (req: NextRequest) => {
  const actor = await gameActor(req);
  const limited = rateLimit(req, { key: "coloring-share", bucket: actor.householdId, limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  // Read at most the allowed bytes, even when Content-Length is absent.
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Picture is required" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      return NextResponse.json({ error: "Picture is too large to share" }, { status: 413 });
    }
    chunks.push(value);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch {
    return NextResponse.json({ error: "Invalid picture" }, { status: 400 });
  }
  const scene = COLORING_SCENES.find((item) => item.id === body?.sceneId);
  if (!scene || typeof body?.memberId !== "string" || typeof body?.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) {
    return NextResponse.json({ error: "Choose a picture and artist" }, { status: 400 });
  }
  if (!await accessibleMember(actor, body.memberId)) {
    return NextResponse.json({ error: "You do not have access to this family member" }, { status: 403 });
  }
  const existing = await prisma.coloringPost.findUnique({ where: { id: body.id }, select: { householdId: true, memberId: true } });
  if (existing) {
    if (existing.householdId !== actor.householdId || existing.memberId !== body.memberId) return NextResponse.json({ error: "Picture unavailable" }, { status: 403 });
    return NextResponse.json({ id: body.id });
  }
  if (typeof body.image !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(body.image)) {
    return NextResponse.json({ error: "A PNG picture is required" }, { status: 400 });
  }
  let image: Buffer;
  try {
    image = await sharp(Buffer.from(body.image.split(",")[1], "base64"), { limitInputPixels: 16_000_000, failOn: "error" })
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "This picture could not be opened. Please try again." }, { status: 400 });
  }
  // A stable client ID makes a retry safe if a successful response was lost.
  await prisma.coloringPost.upsert({
    where: { id: body.id }, update: {},
    create: { id: body.id, householdId: actor.householdId, memberId: body.memberId, sceneId: scene.id, title: typeof body.title === "string" ? body.title.trim().slice(0, 80) || scene.title : scene.title, image },
  });
  return NextResponse.json({ id: body.id }, { status: 201 });
});
