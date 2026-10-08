import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { prisma } from "../lib/prisma";
import { createSessionToken, parentSession } from "../lib/session";
import { createDeviceSessionToken, deviceSession } from "../lib/device-session";
import { createPet, petDay, type PetState } from "../lib/pocket-pals";
import { GET, POST } from "../app/api/pocket-pals/route";

// Replace only database calls: real route handlers, authentication, permissions,
// server-side care, and validation run without touching the configured database.
function fixture(t: TestContext) {
  const now = Date.now();
  const day = petDay(now, "America/New_York");
  const member = { id: "child-1", householdId: "home-1", parentAccountId: null, role: "child", name: "Alex", age: 7, totalPoints: 10 };
  const setting = { enabled: true, ageMin: 3, ageMax: 18, rewardType: "points", rewardPoints: 5, rewardTickets: 0, requiresChoresComplete: false, dailyPlayLimit: 0 };
  let saved: { id: string; householdId: string; memberId: string; version: number; state: PetState } | null = null;
  let conflict = false;
  const sessions: Array<{ playedAt: Date; rewardPoints: number }> = [];
  const stub = (target: object, method: string, fn: (...args: any[]) => any) => {
    // Prisma delegates are dynamic proxies with no method descriptors, so
    // replace their callable property directly and restore it after each test.
    const delegate = target as Record<string, any>;
    const original = delegate[method];
    delegate[method] = fn;
    t.after(() => { delegate[method] = original; });
  };
  stub(prisma.familyMember, "findFirst", async ({ where }) => where.id === member.id && where.householdId === member.householdId ? member : null);
  stub(prisma.parentAccount, "findFirst", async () => ({ childAccessMode: "all" }));
  stub(prisma.household, "findUniqueOrThrow", async () => ({ timeZone: "America/New_York" }));
  stub(prisma.householdDevice, "findFirst", async () => ({ id: "device-1" }));
  stub(prisma.gameSetting, "upsert", async () => setting);
  stub(prisma.choreAssignment, "findMany", async () => [{ frequency: "daily", completions: [] }]);
  stub(prisma.virtualPet, "findFirst", async () => saved ? structuredClone(saved) : null);
  stub(prisma.virtualPet, "findUnique", async () => saved ? structuredClone(saved) : null);
  stub(prisma.virtualPet, "create", async ({ data }) => { saved = { id: "pet-1", version: 0, ...structuredClone(data) }; return saved; });
  stub(prisma.virtualPet, "updateMany", async ({ where, data }) => {
    if (conflict || !saved || saved.version !== where.version) return { count: 0 };
    saved.state = structuredClone(data.state); saved.version++;
    return { count: 1 };
  });
  stub(prisma.gameSession, "findMany", async () => sessions);
  stub(prisma.gameSession, "create", async ({ data }) => { const session = { ...data, playedAt: new Date() }; sessions.push(session); return session; });
  stub(prisma.familyMember, "update", async ({ data }) => { if (data.totalPoints) member.totalPoints += data.totalPoints.increment; return member; });
  stub(prisma, "$transaction", async (fn) => fn(prisma));
  const token = createSessionToken({ id: "parent-1", householdId: "home-1", email: "parent@example.test" });
  let counter = 0;
  const request = (method: string, body?: Record<string, unknown>, cookie = `${parentSession.name}=${token}`) => new NextRequest("http://localhost/api/pocket-pals?memberId=child-1", {
    method, headers: { cookie, "Content-Type": "application/json", "x-forwarded-for": `test-${now}-${counter++}` },
    ...(body && { body: JSON.stringify({ memberId: "child-1", ...body }) }),
  });
  return { request, setting, sessions, member, getSaved: () => saved, forceConflict: () => { conflict = true; },
    seed: () => { saved = { id: "pet-1", householdId: "home-1", memberId: "child-1", version: 0, state: createPet("dog", "Mochi", now - 5000, day) }; return saved; } };
}

test("an unauthenticated visitor cannot read or adopt a pet", async () => {
  const req = new NextRequest("http://localhost/api/pocket-pals?memberId=child-1");
  assert.equal((await GET(req)).status, 401);
  assert.equal((await POST(new NextRequest(req.url, { method: "POST", body: JSON.stringify({ memberId: "child-1", action: "adopt", species: "cat", name: "Miso" }), headers: { "Content-Type": "application/json" } }))).status, 401);
});

test("parent permissions and paired-device identity protect other children's pets", async (t) => {
  const f = fixture(t);
  assert.equal((await POST(f.request("POST", { memberId: "other-child", action: "adopt", species: "cat", name: "Miso" }))).status, 403);
  const device = createDeviceSessionToken({ id: "device-1", householdId: "home-1", memberId: "other-child", mode: "member", secret: "device-secret" });
  assert.equal((await GET(f.request("GET", undefined, `${deviceSession.name}=${device}`))).status, 403);
  assert.equal(f.getSaved(), null);
});

test("enabled, age, and chore settings are checked by the API", async (t) => {
  const f = fixture(t);
  f.setting.enabled = false;
  assert.equal((await GET(f.request("GET"))).status, 403);
  f.setting.enabled = true; f.setting.ageMin = 10;
  assert.equal((await GET(f.request("GET"))).status, 403);
  f.setting.ageMin = 3; f.setting.requiresChoresComplete = true;
  assert.equal((await POST(f.request("POST", { action: "adopt", species: "dog", name: "Mochi" }))).status, 403);
  assert.equal(f.getSaved(), null);
});

test("adoption persists and stale updates cannot overwrite care from another screen", async (t) => {
  const f = fixture(t);
  const adopted = await POST(f.request("POST", { action: "adopt", species: "cat", name: " Miso " }));
  assert.equal(adopted.status, 200);
  assert.equal((await adopted.json()).pet.name, "Miso");
  const fed = await POST(f.request("POST", { action: "feed", version: 0 }));
  assert.equal(fed.status, 200);
  assert.equal(f.getSaved()?.state.dumplings, 5);
  const stale = await POST(f.request("POST", { action: "clean", version: 0 }));
  assert.equal(stale.status, 409);
  assert.equal(f.getSaved()?.version, 1);
  const reloaded = await GET(f.request("GET"));
  assert.equal((await reloaded.json()).pet.dumplings, 5);
});

test("an earned daily badge credits configured family points only once", async (t) => {
  const f = fixture(t);
  const saved = f.seed();
  saved.state.daily.tasks = ["feed", "clean", "play", "learn", "sleep"];
  const first = await POST(f.request("POST", { action: "wake", version: 0 }));
  assert.equal(first.status, 200);
  const result = await first.json();
  assert.equal(result.completed, true);
  assert.deepEqual(result.reward, { points: 5, tickets: 0 });
  assert.equal(f.member.totalPoints, 15);
  assert.equal(f.sessions.length, 1);
  const duplicate = await POST(f.request("POST", { action: "wake", version: 1 }));
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).completed, false);
  assert.equal(f.sessions.length, 1);
  assert.equal(f.member.totalPoints, 15);
  assert.equal((await POST(f.request("POST", { action: "wake", version: 0 }))).status, 409);
});

test("a write race tells the client to reload without replacing newer care", async (t) => {
  const f = fixture(t);
  f.seed();
  f.forceConflict();
  const response = await POST(f.request("POST", { action: "feed", version: 0 }));
  assert.equal(response.status, 409);
  assert.equal(f.getSaved()?.version, 0);
  assert.equal(f.getSaved()?.state.dumplings, 6);
});
