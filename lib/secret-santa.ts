import { randomInt } from "crypto";

export type SecretSantaCandidate = {
  id: string;
  householdId: string;
};

function shuffled<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function drawSecretSanta(candidates: SecretSantaCandidate[], preventSameHousehold: boolean) {
  if (candidates.length < 3) throw new Error("At least 3 participants are needed to draw names");

  const giverByRecipient = new Map<string, string>();
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  function findRecipient(giver: SecretSantaCandidate, seenRecipients: Set<string>): boolean {
    const eligible = shuffled(candidates).filter((recipient) =>
      recipient.id !== giver.id && (!preventSameHousehold || recipient.householdId !== giver.householdId)
    );
    for (const recipient of eligible) {
      if (seenRecipients.has(recipient.id)) continue;
      seenRecipients.add(recipient.id);
      const previousGiverId = giverByRecipient.get(recipient.id);
      if (!previousGiverId || findRecipient(candidatesById.get(previousGiverId)!, seenRecipients)) {
        giverByRecipient.set(recipient.id, giver.id);
        return true;
      }
    }
    return false;
  }

  for (const giver of shuffled(candidates)) {
    if (!findRecipient(giver, new Set())) {
      throw new Error(preventSameHousehold
        ? "A private draw is not possible with these households. Add more households or allow same-household matches."
        : "A Secret Santa draw is not possible with these participants.");
    }
  }

  const assignments = new Map<string, string>();
  for (const [recipientId, giverId] of giverByRecipient) assignments.set(giverId, recipientId);
  return assignments;
}
