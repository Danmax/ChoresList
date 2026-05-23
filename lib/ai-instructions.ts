import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface ChoreInstructionData {
  steps: string[];
  tips: string[];
  safetyNotes: string[];
}

const SYSTEM_PROMPT = `You are a friendly parenting assistant that creates clear, encouraging chore guides for kids.
Always use simple, positive language with action verbs. Make instructions fun and achievable.
Return ONLY valid JSON — no markdown, no extra text.`;

export async function generateChoreInstructions(
  choreName: string,
  category: string,
  ageMin: number,
  ageMax: number
): Promise<ChoreInstructionData> {
  const userPrompt = `Create step-by-step instructions for "${choreName}" (category: ${category}) suitable for kids aged ${ageMin}–${ageMax}.

Return a JSON object with exactly these keys:
- "steps": array of 4-8 clear action steps (short sentences starting with a verb)
- "tips": array of 2-3 encouraging tips to do the job well
- "safetyNotes": array of 0-3 age-appropriate safety reminders (empty array if no safety concerns)

Keep language simple, positive, and motivating for kids.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return {
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      safetyNotes: Array.isArray(parsed.safetyNotes) ? parsed.safetyNotes : [],
    };
  } catch {
    return { steps: [text], tips: [], safetyNotes: [] };
  }
}

export async function* streamChoreInstructions(
  choreName: string,
  category: string,
  ageMin: number,
  ageMax: number
): AsyncGenerator<string> {
  const userPrompt = `Create step-by-step instructions for "${choreName}" (category: ${category}) suitable for kids aged ${ageMin}–${ageMax}.

Return a JSON object with exactly these keys:
- "steps": array of 4-8 clear action steps (short sentences starting with a verb)
- "tips": array of 2-3 encouraging tips to do the job well
- "safetyNotes": array of 0-3 age-appropriate safety reminders (empty array if no safety concerns)

Keep language simple, positive, and motivating for kids.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
