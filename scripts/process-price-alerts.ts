import "dotenv/config";
import { getAmazonProduct } from "../lib/amazon-creators";
import { sendNotificationEmail } from "../lib/email";
import { prisma } from "../lib/prisma";

function asinFromUrl(url: string) {
  return /(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})(?:[/?]|$)/i.exec(url)?.[1] ?? null;
}

function centsFromPrice(price: string | null) {
  const amount = Number(price?.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

async function run() {
  const watches = await prisma.wishListItem.findMany({ where: { priceAlertCents: { not: null }, amazonUrl: { not: null }, status: "pending" }, select: { id: true, householdId: true, title: true, amazonUrl: true, priceAlertCents: true, priceAlertSentAt: true } });
  for (const watch of watches) {
    const asin = asinFromUrl(watch.amazonUrl ?? "");
    if (!asin || watch.priceAlertCents === null) continue;
    const product = await getAmazonProduct(asin);
    const priceCents = centsFromPrice(product?.price ?? null);
    if (priceCents === null) continue;
    const now = new Date();
    const isDeal = priceCents <= watch.priceAlertCents;
    await prisma.wishListItem.update({ where: { id: watch.id }, data: { lastPriceCents: priceCents, lastPriceCheckedAt: now, ...(isDeal ? { priceAlertSentAt: now } : { priceAlertSentAt: null }) } });
    if (!isDeal || watch.priceAlertSentAt) continue;
    const parents = await prisma.parentAccount.findMany({ where: { householdId: watch.householdId }, select: { email: true } });
    const price = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceCents / 100);
    await Promise.all(parents.map((parent) => sendNotificationEmail({ to: parent.email, subject: `Price alert: ${watch.title}`, text: `${watch.title} is now ${price} on Amazon, at or below your target price.`, html: `<p><strong>${watch.title}</strong> is now <strong>${price}</strong> on Amazon, at or below your target price.</p>` })));
  }
}

run().finally(() => prisma.$disconnect());
