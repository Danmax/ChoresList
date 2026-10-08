import assert from "node:assert/strict";
import test from "node:test";
import { createGameInviteToken, verifyGameInviteToken } from "../lib/session";

test("game invite tokens preserve their approved group context and reject tampering", () => {
  const token = createGameInviteToken({
    householdId: "household-1",
    inviterParentId: "parent-1",
    groupId: "group-1",
    eventId: "event-1",
  });
  const invite = verifyGameInviteToken(token);
  assert.equal(invite?.householdId, "household-1");
  assert.equal(invite?.inviterParentId, "parent-1");
  assert.equal(invite?.groupId, "group-1");
  assert.equal(invite?.eventId, "event-1");
  assert.equal(verifyGameInviteToken(`${token}changed`), null);
});
