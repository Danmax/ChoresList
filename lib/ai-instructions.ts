import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY ?? "" });

export interface ChoreInstructionData {
  steps: string[];
  tips: string[];
  safetyNotes: string[];
}

const SYSTEM_PROMPT = `You are a friendly parenting assistant that creates clear, encouraging chore guides for kids.
Always use simple, positive language with action verbs. Make instructions fun and achievable.
Return ONLY valid JSON — no markdown, no extra text.`;

const buildUserPrompt = (choreName: string, category: string, ageMin: number, ageMax: number) =>
  `Create step-by-step instructions for "${choreName}" (category: ${category}) suitable for kids aged ${ageMin}–${ageMax}.

Return a JSON object with exactly these keys:
- "steps": array of 4-8 clear action steps (short sentences starting with a verb)
- "tips": array of 2-3 encouraging tips to do the job well
- "safetyNotes": array of 0-3 age-appropriate safety reminders (empty array if no safety concerns)

Keep language simple, positive, and motivating for kids.`;

function parseResponse(text: string): ChoreInstructionData {
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

export async function generateChoreInstructions(
  choreName: string,
  category: string,
  ageMin: number,
  ageMax: number
): Promise<ChoreInstructionData> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(choreName, category, ageMin, ageMax) },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  return parseResponse(text);
}

export async function* streamChoreInstructions(
  choreName: string,
  category: string,
  ageMin: number,
  ageMax: number
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(choreName, category, ageMin, ageMax) },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
