import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email";

type Payload = Record<string, unknown>;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function baseUrl() {
  const value = process.env.PUBLIC_BASE_URL?.trim();
  if (!value) throw new Error("PUBLIC_BASE_URL is required for notification emails");
  return value.replace(/\/$/, "");
}

function eventUrl(groupId: string, eventId: string) {
  return `${baseUrl()}/community/${groupId}?event=${eventId}`;
}

function zonedParts(date: Date, timeZone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as Record<string, number>;
}

function zonedDateTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string) {
  const target = Date.UTC(year, month - 1, day, hour, 0, 0);
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = zonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(current.year, current.month - 1, current.day, current.hour, current.minute, current.second);
    guess += target - represented;
  }
  return new Date(guess);
}

function reminderTime(eventDate: Date, timeZone: string, daysBefore: number) {
  const local = zonedParts(eventDate, timeZone);
  const date = new Date(Date.UTC(local.year, local.month - 1, local.day));
  date.setUTCDate(date.getUTCDate() - daysBefore);
  return zonedDateTimeToUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 8, timeZone);
}

export async function enqueueNotification(input: {
  type: string; recipientParentId?: string | null; recipientEmail: string; groupId?: string | null;
  eventId?: string | null; dedupeKey: string; scheduledFor?: Date; payload: Payload;
}) {
  const existing = await prisma.emailNotification.findUnique({ where: { dedupeKey: input.dedupeKey }, select: { id: true, status: true } });
  if (existing?.status === "sent") return existing;
  return prisma.emailNotification.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: { ...input, scheduledFor: input.scheduledFor ?? new Date(), payload: input.payload as Prisma.InputJsonValue },
    update: {
      recipientEmail: input.recipientEmail, scheduledFor: input.scheduledFor ?? new Date(),
      payload: input.payload as Prisma.InputJsonValue, status: "pending", lastError: null, lockedAt: null,
    },
  });
}

async function eligibleMembership(groupId: string, parentId: string) {
  return prisma.communityMember.findFirst({
    where: { groupId, parentId, status: "active", emailNotificationsEnabled: true },
    include: { parent: { select: { id: true, email: true, emailVerified: true, displayName: true } } },
  });
}

export async function syncOneTimeEventReminders(eventId: string, parentId?: string) {
  const event = await prisma.communityEvent.findUnique({
    where: { id: eventId },
    include: {
      rsvps: { where: { status: { in: ["going", "maybe"] }, ...(parentId && { parentId }) }, select: { parentId: true } },
      attendance: { include: { participant: { select: { parentId: true } } } },
    },
  });
  if (!event) return;
  const parentIds = new Set(event.rsvps.map((rsvp) => rsvp.parentId));
  for (const attendance of event.attendance) {
    if (!parentId || attendance.participant.parentId === parentId) parentIds.add(attendance.participant.parentId);
  }
  await prisma.emailNotification.updateMany({
    where: { eventId, type: { startsWith: "event-reminder-" }, status: { in: ["pending", "failed"] }, ...(parentId && { recipientParentId: parentId }) },
    data: { status: "cancelled" },
  });
  if (event.recurring !== "none") return;

  for (const recipientParentId of parentIds) {
    const membership = await eligibleMembership(event.groupId, recipientParentId);
    if (!membership?.emailEventReminders || !membership.parent.emailVerified) continue;
    for (const daysBefore of [10, 3, 0]) {
      const scheduledFor = reminderTime(event.date, event.timeZone || "UTC", daysBefore);
      if (scheduledFor <= new Date()) continue;
      await enqueueNotification({
        type: `event-reminder-${daysBefore}d`, recipientParentId, recipientEmail: membership.parent.email,
        groupId: event.groupId, eventId, scheduledFor,
        dedupeKey: `event-reminder:${eventId}:${recipientParentId}:${daysBefore}:${event.date.toISOString()}`,
        payload: { title: event.title, date: event.date.toISOString(), timeZone: event.timeZone, daysBefore, url: eventUrl(event.groupId, event.id) },
      });
    }
  }
}

export async function syncUpcomingOneTimeEventReminders(now = new Date()) {
  const events = await prisma.communityEvent.findMany({
    where: {
      recurring: "none",
      date: { gt: now, lte: new Date(now.getTime() + 11 * 86_400_000) },
    },
    select: { id: true },
  });
  for (const event of events) await syncOneTimeEventReminders(event.id);
}

export async function enqueueRsvpConfirmation(eventId: string, parentId: string, status: string) {
  const event = await prisma.communityEvent.findUnique({ where: { id: eventId }, select: { id: true, groupId: true, title: true, date: true, timeZone: true } });
  const membership = event ? await eligibleMembership(event.groupId, parentId) : null;
  if (!event || !membership?.emailRegistrationUpdates || !membership.parent.emailVerified) return;
  await enqueueNotification({
    type: "rsvp-confirmation", recipientParentId: parentId, recipientEmail: membership.parent.email, groupId: event.groupId, eventId,
    dedupeKey: `rsvp:${eventId}:${parentId}:${status}:${Date.now()}`,
    payload: { title: event.title, status, date: event.date.toISOString(), timeZone: event.timeZone, url: eventUrl(event.groupId, event.id) },
  });
}

export async function enqueueItemAssignment(itemId: string) {
  const item = await prisma.communityEventItem.findUnique({
    where: { id: itemId },
    include: { assignedTo: { select: { id: true, email: true, emailVerified: true } }, event: { select: { id: true, groupId: true, title: true, date: true } } },
  });
  if (!item?.assignedTo || !item.assignedTo.emailVerified) return;
  const membership = await eligibleMembership(item.event.groupId, item.assignedTo.id);
  if (!membership?.emailItemAssignments) return;
  await enqueueNotification({
    type: "item-assigned", recipientParentId: item.assignedTo.id, recipientEmail: item.assignedTo.email,
    groupId: item.event.groupId, eventId: item.event.id,
    dedupeKey: `item-assigned:${item.id}:${item.assignedTo.id}:${item.updatedAt.toISOString()}`,
    payload: { item: item.title, quantity: item.quantity, eventTitle: item.event.title, date: item.event.date.toISOString(), url: eventUrl(item.event.groupId, item.event.id) },
  });
}

export async function enqueueRegistrationConfirmation(eventId: string, parentId: string) {
  const event = await prisma.communityEvent.findUnique({ where: { id: eventId }, select: { id: true, groupId: true, title: true, date: true, timeZone: true } });
  const membership = event ? await eligibleMembership(event.groupId, parentId) : null;
  if (!event || !membership?.emailRegistrationUpdates || !membership.parent.emailVerified) return;
  await enqueueNotification({
    type: "registration-confirmation", recipientParentId: parentId, recipientEmail: membership.parent.email,
    groupId: event.groupId, eventId,
    dedupeKey: `registration:${eventId}:${parentId}`,
    payload: { title: event.title, date: event.date.toISOString(), timeZone: event.timeZone, url: eventUrl(event.groupId, event.id) },
  });
}

function formatEventDate(payload: Payload) {
  return new Date(String(payload.date)).toLocaleString("en-US", { timeZone: String(payload.timeZone || "UTC"), weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export async function deliverNotification(notification: { id: string; type: string; recipientEmail: string; payload: Prisma.JsonValue }) {
  const payload = notification.payload as Payload;
  let subject = "ChoresList notification";
  let heading = subject;
  let message = "You have a new notification.";
  if (notification.type.startsWith("event-reminder-")) {
    const days = Number(payload.daysBefore);
    subject = days === 0 ? `Today: ${payload.title}` : `${payload.title} is in ${days} days`;
    heading = subject;
    message = `${payload.title} is scheduled for ${formatEventDate(payload)}.`;
  } else if (notification.type === "item-assigned") {
    subject = `Potluck item assigned: ${payload.item}`; heading = subject;
    message = `You were assigned ${payload.quantity ? `${payload.quantity} ` : ""}${payload.item} for ${payload.eventTitle}.`;
  } else if (notification.type === "rsvp-confirmation") {
    subject = `RSVP updated for ${payload.title}`; heading = subject;
    message = `Your RSVP is ${payload.status}. Event time: ${formatEventDate(payload)}.`;
  } else if (notification.type === "registration-confirmation") {
    subject = `Registration confirmed: ${payload.title}`; heading = subject;
    message = `Your registration is confirmed for ${formatEventDate(payload)}.`;
  } else if (notification.type === "manager-weekly-summary") {
    subject = `Weekly community summary: ${payload.groupName}`; heading = subject;
    message = String(payload.summary ?? "No upcoming activity.");
  }
  const url = typeof payload.url === "string" ? payload.url : baseUrl();
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a"><h1 style="font-size:20px">${escapeHtml(heading)}</h1><p>${safeMessage}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#8b5cf6;color:white;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Open ChoresList</a></p></div>`;
  return sendNotificationEmail({ to: notification.recipientEmail, subject, text: `${message}\n\n${url}`, html });
}

export async function notificationIsEnabled(notification: { type: string; groupId: string | null; recipientParentId: string | null }) {
  if (!notification.groupId || !notification.recipientParentId) return true;
  const membership = await prisma.communityMember.findUnique({
    where: { groupId_parentId: { groupId: notification.groupId, parentId: notification.recipientParentId } },
    select: {
      status: true,
      role: true,
      emailNotificationsEnabled: true,
      emailItemAssignments: true,
      emailEventReminders: true,
      emailRegistrationUpdates: true,
      emailManagerWeeklySummary: true,
    },
  });
  if (!membership || membership.status !== "active" || !membership.emailNotificationsEnabled) return false;
  if (notification.type.startsWith("event-reminder-")) return membership.emailEventReminders;
  if (notification.type === "item-assigned") return membership.emailItemAssignments;
  if (["rsvp-confirmation", "registration-confirmation"].includes(notification.type)) return membership.emailRegistrationUpdates;
  if (notification.type === "manager-weekly-summary") {
    return membership.emailManagerWeeklySummary && ["owner", "manager"].includes(membership.role);
  }
  return true;
}

export async function enqueueWeeklyManagerSummaries(now = new Date()) {
  const managers = await prisma.communityMember.findMany({
    where: { status: "active", role: { in: ["owner", "manager"] }, emailNotificationsEnabled: true, emailManagerWeeklySummary: true, parent: { emailVerified: true } },
    include: { parent: { include: { household: { select: { timeZone: true } } } }, group: { select: { id: true, name: true } } },
  });
  for (const manager of managers) {
    const timeZone = manager.parent.household.timeZone || "UTC";
    const localText = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const parts = Object.fromEntries(localText.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
    if (parts.weekday !== "Mon" || Number(parts.hour) < 8) continue;
    const weekKey = `${parts.year}-${parts.month}-${parts.day}`;
    const end = new Date(now.getTime() + 14 * 86400000);
    const since = new Date(now.getTime() - 7 * 86400000);
    const events = await prisma.communityEvent.findMany({
      where: { groupId: manager.groupId, date: { gte: now, lte: end } },
      include: { rsvps: true, attendance: { where: { createdAt: { gte: since } } }, items: true }, orderBy: { date: "asc" },
    });
    const summary = events.length ? events.map((event) => {
      const going = event.rsvps.filter((r) => r.status === "going").length;
      const unclaimed = event.items.filter((item) => item.status === "open").length;
      return `${event.title}: ${going} going, ${event.attendance.length} new registrations, ${unclaimed} open items`;
    }).join("\n") : "No events in the next 14 days.";
    await enqueueNotification({
      type: "manager-weekly-summary", recipientParentId: manager.parentId, recipientEmail: manager.parent.email,
      groupId: manager.groupId, dedupeKey: `manager-weekly:${manager.groupId}:${manager.parentId}:${weekKey}`,
      payload: { groupName: manager.group.name, summary, url: `${baseUrl()}/community/${manager.groupId}` },
    });
  }
}
