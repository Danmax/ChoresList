import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type PushMessage = { title: string; body: string; url: string };

function pushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() ?? "";
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

export function webPushPublicKey() {
  return pushConfig()?.publicKey ?? null;
}

export async function sendPushToDevices(deviceIds: string[], message: PushMessage) {
  const config = pushConfig();
  if (!config || deviceIds.length === 0) return;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const subscriptions = await prisma.devicePushSubscription.findMany({ where: { deviceId: { in: deviceIds } } });
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(message), { TTL: 60, urgency: "high" });
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.devicePushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        return;
      }
      console.error("[web-push] Could not deliver a notification", error);
    }
  }));
}

export async function sendChessPush(householdId: string, memberId: string, message: PushMessage) {
  const devices = await prisma.householdDevice.findMany({
    where: { householdId, revokedAt: null, OR: [{ memberId }, { mode: "household" }] },
    select: { id: true },
  });
  await sendPushToDevices(devices.map((device) => device.id), message);
}
