import { createHmac, timingSafeEqual } from "crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_COOKIE = "parent-session";
const INVITE_TTL_SECONDS = 60 * 60 * 24 * 14;
const COMMUNITY_INVITE_TTL_SECONDS = 60 * 60 * 24 * 14;

export type SessionPayload = {
  parentId: string;
  householdId: string;
  email: string;
  expiresAt: number;
};

export type HouseholdAccountRole = "owner" | "parent" | "grandparent";

export type HouseholdInvitePayload = {
  householdId: string;
  accountRole: Exclude<HouseholdAccountRole, "owner">;
  parentType: string;
  relationshipLabel?: string;
  childAccessMode: string;
  childAccessMemberIds?: string[];
  expiresAt: number;
};

export type CommunityInvitePayload = {
  groupId: string;
  role: "owner" | "manager" | "member";
  eventId?: string;
  expiresAt: number;
};

const PLACEHOLDER_SECRETS = new Set([
  "",
  "dev-secret-change-me",
  "replace-with-a-long-random-string",
]);

function secret() {
  const value = process.env.AUTH_SECRET?.trim() ?? "";
  if (PLACEHOLDER_SECRETS.has(value) || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a random value of at least 32 characters");
    }
    return "dev-only-secret-change-me-now";
  }
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function signatureMatches(payload: string, signature: string, length = 64) {
  if (signature.length !== length) return false;
  const expected = sign(payload).slice(0, length);
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createSessionToken(parent: { id: string; householdId: string; email: string }) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      parentId: parent.id,
      householdId: parent.householdId,
      email: parent.email,
      expiresAt,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  if (!signatureMatches(payload, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (
      typeof parsed.parentId !== "string" ||
      typeof parsed.householdId !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const parentSession = {
  name: SESSION_COOKIE,
  maxAge: SESSION_TTL_SECONDS,
};

function cleanHouseholdInviteRole(value: unknown): Exclude<HouseholdAccountRole, "owner"> {
  return value === "grandparent" ? "grandparent" : "parent";
}

function cleanInviteText(value: unknown, fallback: string, max = 128) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function cleanChildAccessMode(value: unknown) {
  return value === "selected" || value === "none" ? value : "all";
}

function cleanChildAccessMemberIds(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0)))
    : [];
}

export function createHouseholdInviteToken({
  householdId,
  accountRole = "parent",
  parentType,
  relationshipLabel,
  childAccessMode,
  childAccessMemberIds,
}: {
  householdId: string;
  accountRole?: Exclude<HouseholdAccountRole, "owner">;
  parentType?: string;
  relationshipLabel?: string;
  childAccessMode?: string;
  childAccessMemberIds?: string[];
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + INVITE_TTL_SECONDS;
  const mode = cleanChildAccessMode(childAccessMode);
  const payload = Buffer.from(
    JSON.stringify({
      purpose: "household-invite",
      householdId,
      accountRole: cleanHouseholdInviteRole(accountRole),
      parentType: cleanInviteText(parentType, accountRole === "grandparent" ? "grandparent" : "parent", 64),
      relationshipLabel: cleanInviteText(relationshipLabel, "", 128),
      childAccessMode: mode,
      childAccessMemberIds: mode === "selected" ? cleanChildAccessMemberIds(childAccessMemberIds) : [],
      expiresAt,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyHouseholdInviteToken(token?: string): HouseholdInvitePayload | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  if (!signatureMatches(payload, signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      purpose?: string;
      householdId?: unknown;
      accountRole?: unknown;
      parentType?: unknown;
      relationshipLabel?: unknown;
      childAccessMode?: unknown;
      childAccessMemberIds?: unknown;
      expiresAt?: unknown;
    };
    if (
      parsed.purpose !== "household-invite" ||
      typeof parsed.householdId !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return {
      householdId: parsed.householdId,
      accountRole: cleanHouseholdInviteRole(parsed.accountRole),
      parentType: cleanInviteText(parsed.parentType, cleanHouseholdInviteRole(parsed.accountRole) === "grandparent" ? "grandparent" : "parent", 64),
      relationshipLabel: cleanInviteText(parsed.relationshipLabel, "", 128) || undefined,
      childAccessMode: cleanChildAccessMode(parsed.childAccessMode),
      childAccessMemberIds: cleanChildAccessMemberIds(parsed.childAccessMemberIds),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function createCommunityInviteToken({
  groupId,
  role = "member",
  eventId,
}: {
  groupId: string;
  role?: "owner" | "manager" | "member";
  eventId?: string | null;
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + COMMUNITY_INVITE_TTL_SECONDS;
  const roleCode = role === "owner" ? "o" : role === "manager" ? "a" : "m";
  const payload = Buffer.from(["1", groupId, roleCode, expiresAt, eventId ?? ""].join("|")).toString("base64url");
  return `${payload}.${sign(payload).slice(0, 32)}`;
}

export function verifyCommunityInviteToken(token?: string): CommunityInvitePayload | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  if (!signatureMatches(payload, signature, signature.length === 32 ? 32 : 64)) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    if (decoded.startsWith("1|")) {
      const [, groupId, roleCode, expiresAtValue, eventId] = decoded.split("|");
      const role = roleCode === "o" ? "owner" : roleCode === "a" ? "manager" : roleCode === "m" ? "member" : null;
      const expiresAt = Number(expiresAtValue);
      if (!groupId || !role || !Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
        return null;
      }
      return { groupId, role, ...(eventId ? { eventId } : {}), expiresAt };
    }

    const parsed = JSON.parse(decoded) as {
      purpose?: string;
      groupId?: unknown;
      role?: unknown;
      eventId?: unknown;
      expiresAt?: unknown;
    };
    const role = parsed.role === "owner" || parsed.role === "manager" || parsed.role === "member" ? parsed.role : null;
    const eventId = typeof parsed.eventId === "string" ? parsed.eventId : undefined;
    if (
      parsed.purpose !== "community-invite" ||
      typeof parsed.groupId !== "string" ||
      !role ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return { groupId: parsed.groupId, role, ...(eventId ? { eventId } : {}), expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}
