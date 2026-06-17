import { google, calendar_v3 } from "googleapis";
import { GaxiosError } from "gaxios";
import { prisma } from "@/lib/prisma";
import type { FamilyEvent, GoogleCalendarConnection, Household } from "@prisma/client";

type GoogleFamilyEvent = FamilyEvent & {
  household: Pick<
    Household,
    "id" | "timeZone" | "googleCalendarEnabled" | "googleCalendarId" | "googleCalendarSyncEvents"
  >;
};

type SyncContext = {
  connection: GoogleCalendarConnection;
  calendarId: string;
};

const DEFAULT_TIME_ZONE = "America/New_York";
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for Google Calendar sync`);
  return value;
}

function googleOAuthClient() {
  return new google.auth.OAuth2(
    requiredEnv("GOOGLE_CLIENT_ID"),
    requiredEnv("GOOGLE_CLIENT_SECRET"),
    requiredEnv("GOOGLE_REDIRECT_URI")
  );
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function untilValue(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildDescription(event: FamilyEvent) {
  const parts = [
    event.notes,
    event.location ? `Location: ${event.location}` : null,
    event.meetingUrl ? `Meeting: ${event.meetingUrl}` : null,
    event.rsvpUrl ? `RSVP: ${event.rsvpUrl}` : null,
    event.flyerUrl ? `Flyer: ${event.flyerUrl}` : null,
    event.registrationUrl ? `Registration: ${event.registrationUrl}` : null,
    event.registrationNotes ? `Registration notes: ${event.registrationNotes}` : null,
    event.resources ? `Resources: ${event.resources}` : null,
  ];
  return parts.filter(Boolean).join("\n\n") || undefined;
}

function recurrenceRule(event: FamilyEvent) {
  if (event.recurring !== "weekly" && event.recurring !== "monthly") return undefined;

  const parts = [`FREQ=${event.recurring === "weekly" ? "WEEKLY" : "MONTHLY"}`];
  if (event.recurringCount && event.recurringCount > 0) {
    parts.push(`COUNT=${event.recurringCount}`);
  } else if (event.recurringEndDate) {
    parts.push(`UNTIL=${untilValue(event.recurringEndDate)}`);
  }

  return [`RRULE:${parts.join(";")}`];
}

function googleErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function googleStatus(error: unknown) {
  return error instanceof GaxiosError ? error.response?.status : undefined;
}

function isInvalidGrant(error: unknown) {
  const message = googleErrorMessage(error).toLowerCase();
  return message.includes("invalid_grant");
}

async function markConnectionError(connection: GoogleCalendarConnection, error: unknown) {
  if (isInvalidGrant(error)) {
    try {
      await prisma.googleCalendarConnection.update({
        where: { id: connection.id },
        data: { syncStatus: "disconnected", lastSyncAt: new Date() },
      });
    } catch (persistError) {
      console.error("[Google Calendar] Failed to mark connection disconnected", persistError);
    }
  }
}

async function markEventSyncFailure(eventId: string, error: unknown, connection?: GoogleCalendarConnection) {
  console.error("[Google Calendar] Sync failed", {
    eventId,
    connectionId: connection?.id,
    error,
  });

  if (connection) await markConnectionError(connection, error);

  try {
    await prisma.familyEvent.update({
      where: { id: eventId },
      data: {
        googleCalendarSyncError: googleErrorMessage(error).slice(0, 4000),
      },
    });
  } catch (persistError) {
    console.error("[Google Calendar] Failed to persist sync error", persistError);
  }
}

async function markEventSynced(eventId: string, googleCalendarEventId: string, connection: GoogleCalendarConnection) {
  const now = new Date();
  await prisma.$transaction([
    prisma.familyEvent.update({
      where: { id: eventId },
      data: {
        googleCalendarEventId,
        googleCalendarSyncedAt: now,
        googleCalendarSyncError: null,
      },
    }),
    prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: { syncStatus: "synced", lastSyncAt: now },
    }),
  ]);
}

export function getOAuthClient(connection: GoogleCalendarConnection) {
  const oauth2Client = googleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: connection.refreshToken,
    access_token: connection.accessToken ?? undefined,
    expiry_date: connection.expiresAt?.getTime(),
  });

  oauth2Client.on("tokens", (tokens) => {
    void prisma.googleCalendarConnection
      .update({
        where: { id: connection.id },
        data: {
          accessToken: tokens.access_token ?? undefined,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        },
      })
      .catch((error) => console.error("[Google Calendar] Failed to persist refreshed token", error));
  });

  return oauth2Client;
}

export function getCalendarClient(connection: GoogleCalendarConnection) {
  return google.calendar({
    version: "v3",
    auth: getOAuthClient(connection),
  });
}

export function mapFamilyEventToGoogleEvent(event: GoogleFamilyEvent): calendar_v3.Schema$Event {
  const timeZone = event.household.timeZone || DEFAULT_TIME_ZONE;
  const description = buildDescription(event);
  const requestBody: calendar_v3.Schema$Event = {
    summary: event.title,
    description,
    location: event.location ?? undefined,
    recurrence: recurrenceRule(event),
    extendedProperties: {
      private: {
        choresListFamilyEventId: String(event.id),
        choresListHouseholdId: String(event.householdId),
      },
    },
  };

  if (event.allDay) {
    const start = event.date;
    const end = event.endDate ?? event.date;
    requestBody.start = { date: dateOnly(start) };
    requestBody.end = { date: dateOnly(addDays(end, 1)) };
  } else {
    const start = event.date;
    const end = event.endDate ?? new Date(start.getTime() + 60 * 60 * 1000);
    requestBody.start = { dateTime: start.toISOString(), timeZone };
    requestBody.end = { dateTime: end.toISOString(), timeZone };
  }

  return requestBody;
}

async function getSyncContext(event: GoogleFamilyEvent): Promise<SyncContext | null> {
  if (!event.household.googleCalendarEnabled || !event.household.googleCalendarSyncEvents) return null;

  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { householdId: event.householdId },
  });
  if (!connection) return null;

  return {
    connection,
    calendarId: event.household.googleCalendarId || connection.calendarId || "primary",
  };
}

export async function createGoogleCalendarEvent(event: GoogleFamilyEvent) {
  let context: SyncContext | null = null;

  try {
    context = await getSyncContext(event);
    if (!context) return null;

    const calendar = getCalendarClient(context.connection);
    const googleEvent = mapFamilyEventToGoogleEvent(event);
    const response = await calendar.events.insert({
      calendarId: context.calendarId,
      requestBody: googleEvent,
    });
    if (!response.data.id) throw new Error("Google Calendar did not return an event id");
    await markEventSynced(event.id, response.data.id, context.connection);
    return response.data;
  } catch (error) {
    await markEventSyncFailure(event.id, error, context?.connection);
    return null;
  }
}

export async function updateGoogleCalendarEvent(event: GoogleFamilyEvent) {
  let context: SyncContext | null = null;

  try {
    context = await getSyncContext(event);
    if (!context) return null;

    if (!event.googleCalendarEventId) {
      return createGoogleCalendarEvent(event);
    }

    const calendar = getCalendarClient(context.connection);
    const googleEvent = mapFamilyEventToGoogleEvent(event);
    const response = await calendar.events.update({
      calendarId: context.calendarId,
      eventId: event.googleCalendarEventId,
      requestBody: googleEvent,
    });
    if (!response.data.id) throw new Error("Google Calendar did not return an event id");
    await markEventSynced(event.id, response.data.id, context.connection);
    return response.data;
  } catch (error) {
    if (googleStatus(error) === 404) {
      return createGoogleCalendarEvent({ ...event, googleCalendarEventId: null });
    }
    await markEventSyncFailure(event.id, error, context?.connection);
    return null;
  }
}

export async function deleteGoogleCalendarEvent(event: GoogleFamilyEvent) {
  let context: SyncContext | null = null;

  try {
    context = await getSyncContext(event);
    if (!context || !event.googleCalendarEventId) return;

    const calendar = getCalendarClient(context.connection);
    await calendar.events.delete({
      calendarId: context.calendarId,
      eventId: event.googleCalendarEventId,
    });
    await prisma.googleCalendarConnection.update({
      where: { id: context.connection.id },
      data: { syncStatus: "synced", lastSyncAt: new Date() },
    });
  } catch (error) {
    if (googleStatus(error) === 404) return;
    await markEventSyncFailure(event.id, error, context?.connection);
  }
}

export async function fetchFamilyEventForGoogleSync(eventId: string) {
  return prisma.familyEvent.findUnique({
    where: { id: eventId },
    include: {
      household: {
        select: {
          id: true,
          timeZone: true,
          googleCalendarEnabled: true,
          googleCalendarId: true,
          googleCalendarSyncEvents: true,
        },
      },
    },
  });
}

export function createGoogleAuthorizationUrl(state: string) {
  return googleOAuthClient().generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  const oauth2Client = googleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Reconnect and approve offline access.");
  }

  oauth2Client.setCredentials(tokens);
  let googleAccountEmail: string | null = null;
  try {
    const userInfo = await google.oauth2({ version: "v2", auth: oauth2Client }).userinfo.get();
    googleAccountEmail = userInfo.data.email ?? null;
  } catch (error) {
    console.error("[Google Calendar] Failed to read Google account email", error);
  }

  return {
    googleAccountEmail,
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };
}
