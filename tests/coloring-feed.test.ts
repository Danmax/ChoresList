import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { prisma } from "../lib/prisma";
import { createSessionToken, parentSession } from "../lib/session";
import { createElevationToken, parentElevation } from "../lib/elevation";
import { createDeviceSessionToken, deviceSession } from "../lib/device-session";
import { GET, POST } from "../app/api/coloring/feed/route";
import { GET as IMAGE } from "../app/api/coloring/feed/[id]/route";

type Saved = { id: string; householdId: string; memberId: string; image: Buffer; title: string; sceneId: string };
function fixture(t: TestContext) {
  let saved: Saved | null = null;
  let accessMode = "all";
  const reads: any[] = [];
  const stub = (target: object, method: string, fn: (...args: any[]) => any) => {
    const delegate = target as Record<string, any>, original = delegate[method];
    delegate[method] = fn; t.after(() => { delegate[method] = original; });
  };
  stub(prisma.parentAccount, "findFirst", async () => ({ pinHash: "set", childAccessMode: accessMode, childAccessMemberIds: ["child-1"] }));
  stub(prisma.familyMember, "findFirst", async ({ where }) => where.id === "child-1" && where.householdId === "home-1" ? { id: "child-1", name: "Alex", parentAccountId: null } : null);
  stub(prisma.householdDevice, "findFirst", async () => ({ id: "device-1" }));
  stub(prisma.coloringPost, "findUnique", async () => saved);
  stub(prisma.coloringPost, "upsert", async ({ create }) => { saved ??= create; return saved; });
  stub(prisma.coloringPost, "findMany", async (args) => { reads.push(args); return []; });
  stub(prisma.coloringPost, "findFirst", async (args) => {
    reads.push(args);
    return saved && args.where.householdId === saved.householdId && accessMode === "all" ? saved : null;
  });
  const parent = { id: "parent-1", householdId: "home-1", email: "test@example.test" };
  const cookie = `${parentSession.name}=${createSessionToken(parent)}; ${parentElevation.name}=${createElevationToken(parent)}`;
  const request = (method: string, body?: unknown, auth = cookie, query = "") => new NextRequest(`http://localhost/api/coloring/feed${query}`, {
    method, headers: { cookie: auth, "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { request, reads, getSaved: () => saved, restrict: (mode: string) => { accessMode = mode; }, cookie };
}
async function picture() {
  const png = await sharp({ create: { width: 32, height: 24, channels: 3, background: "#58a17b" } }).png().toBuffer();
  return { id: randomUUID(), memberId: "child-1", sceneId: "jungle-friends", title: " My jungle ", image: `data:image/png;base64,${png.toString("base64")}` };
}

test("feed, picture, and sharing require authentication", async () => {
  const request = new NextRequest("http://localhost/api/coloring/feed");
  assert.equal((await GET(request)).status, 401);
  assert.equal((await POST(new NextRequest(request.url, { method: "POST" }))).status, 401);
  assert.equal((await IMAGE(request, { params: Promise.resolve({ id: randomUUID() }) })).status, 401);
});

test("sharing stores a normalized image once and leaves the original intact on retry", async (t) => {
  const f = fixture(t), body = await picture();
  assert.equal((await POST(f.request("POST", body))).status, 201);
  assert.equal(f.getSaved()?.title, "My jungle");
  assert.equal((await sharp(f.getSaved()!.image).metadata()).format, "webp");
  assert.equal((await POST(f.request("POST", { ...body, title: "Changed" }))).status, 200);
  assert.equal(f.getSaved()?.title, "My jungle");
  const response = await IMAGE(f.request("GET"), { params: Promise.resolve({ id: body.id }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("a paired child can share only as themselves and cannot read the parent feed", async (t) => {
  const f = fixture(t), body = await picture();
  const token = createDeviceSessionToken({ id: "device-1", householdId: "home-1", mode: "member", memberId: "child-1", secret: "secret" });
  const cookie = `${deviceSession.name}=${token}`;
  assert.equal((await POST(f.request("POST", { ...body, memberId: "other-child" }, cookie))).status, 403);
  assert.equal((await POST(f.request("POST", body, cookie))).status, 201);
  assert.equal((await GET(f.request("GET", undefined, cookie))).status, 401);
  assert.equal((await IMAGE(f.request("GET", undefined, cookie), { params: Promise.resolve({ id: body.id }) })).status, 401);
});

test("feed and images enforce parent PIN, household, and child visibility", async (t) => {
  const f = fixture(t), body = await picture();
  await POST(f.request("POST", body));
  const unelevated = f.cookie.split("; ")[0];
  assert.equal((await GET(f.request("GET", undefined, unelevated))).status, 403);
  f.restrict("selected");
  assert.equal((await GET(f.request("GET"))).status, 200);
  assert.deepEqual(f.reads.at(-1).where.member, { OR: [{ id: { in: ["child-1"] } }, { parentAccountId: "parent-1" }] });
  assert.equal(f.reads.at(-1).where.householdId, "home-1");
  assert.equal(f.reads.at(-1).select.image, undefined, "feed pages do not transfer image blobs");
  f.restrict("none");
  assert.equal((await IMAGE(f.request("GET"), { params: Promise.resolve({ id: body.id }) })).status, 404);
  const otherParent = { id: "parent-2", householdId: "home-2", email: "other@example.test" };
  const otherCookie = `${parentSession.name}=${createSessionToken(otherParent)}; ${parentElevation.name}=${createElevationToken(otherParent)}`;
  assert.equal((await IMAGE(f.request("GET", undefined, otherCookie), { params: Promise.resolve({ id: body.id }) })).status, 404);
});

test("invalid pictures, unknown scenes, and oversized requests are rejected", async (t) => {
  const f = fixture(t), body = await picture();
  assert.equal((await POST(f.request("POST", { ...body, sceneId: "missing" }))).status, 400);
  assert.equal((await POST(f.request("POST", { ...body, image: "data:image/png;base64,YmFk" }))).status, 400);
  assert.equal((await POST(f.request("POST", { ...body, image: "x".repeat(6_000_001) }))).status, 413);
  assert.equal(f.getSaved(), null);
});
