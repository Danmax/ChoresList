import assert from "node:assert/strict";
import test from "node:test";
import { drawSecretSanta } from "../lib/secret-santa";

test("drawSecretSanta creates a complete one-to-one draw", () => {
  const people = [
    { id: "a", householdId: "one" },
    { id: "b", householdId: "two" },
    { id: "c", householdId: "three" },
    { id: "d", householdId: "four" },
  ];
  const draw = drawSecretSanta(people, true);
  assert.equal(draw.size, people.length);
  assert.equal(new Set(draw.values()).size, people.length);
  for (const person of people) assert.notEqual(draw.get(person.id), person.id);
});

test("drawSecretSanta keeps assignments outside the giver household", () => {
  const people = [
    { id: "a", householdId: "one" },
    { id: "b", householdId: "one" },
    { id: "c", householdId: "two" },
    { id: "d", householdId: "two" },
  ];
  const draw = drawSecretSanta(people, true);
  for (const person of people) {
    const recipient = people.find((candidate) => candidate.id === draw.get(person.id));
    assert.notEqual(recipient?.householdId, person.householdId);
  }
});

test("drawSecretSanta explains impossible household restrictions", () => {
  assert.throws(() => drawSecretSanta([
    { id: "a", householdId: "one" },
    { id: "b", householdId: "one" },
    { id: "c", householdId: "two" },
  ], true), /not possible/);
});
