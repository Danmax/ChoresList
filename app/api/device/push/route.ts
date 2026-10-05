import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveDeviceSession } from "@/lib/device-session";
import { webPushPublicKey } from "@/lib/web-push";
import { withErrors } from "@/lib/api";

type BrowserSubscription = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

function validSubscription(value: BrowserSubscription) {
  const endpoint = typeof value.endpoint === "string" ? value.endpoint.trim() : "";
  const p256dh = typeof value.keys?.p256dh === "string" ? value.keys.p256dh.trim() : "";
  const auth = typeof value.keys?.auth === "string" ? value.keys.auth.trim() : "";
  if (!endpoint.startsWith("https://") || endpoint.length > 1024 || !p256dh || !auth || auth.length > 255) return null;
  return { endpoint, p256dh, auth };
}

export const GET = withErrors(async (req: NextRequest) => {
  await getActiveDeviceSession(req);
  const publicKey = webPushPublicKey();
  return NextResponse.json({ enabled: Boolean(publicKey), publicKey });
});

export const POST = withErrors(async (req: NextRequest) => {
  const device = await getActiveDeviceSession(req);
  if (!device) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const subscription = validSubscription(await req.json() as BrowserSubscription);
  if (!subscription) return NextResponse.json({ error: "A valid browser push subscription is required" }, { status: 400 });
  await prisma.devicePushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { deviceId: device.deviceId, ...subscription },
    update: { deviceId: device.deviceId, p256dh: subscription.p256dh, auth: subscription.auth },
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const device = await getActiveDeviceSession(req);
  if (!device) return NextResponse.json({ error: "Device access revoked" }, { status: 401 });
  const body = await req.json();
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) return NextResponse.json({ error: "Subscription endpoint is required" }, { status: 400 });
  await prisma.devicePushSubscription.deleteMany({ where: { deviceId: device.deviceId, endpoint } });
  return NextResponse.json({ ok: true });
});
