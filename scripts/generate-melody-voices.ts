import "dotenv/config";
import OpenAI from "openai";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { melodyNarrationCatalog } from "../lib/melody-sound";

const packs = [
  { id: "warm", voice: "marin", direction: "Warm, bright, playful, and welcoming. A friendly adult toy-phone character with a gentle smile." },
  { id: "story", voice: "cedar", direction: "Soft, cozy, expressive storyteller. A friendly adult with a calm, reassuring voice." },
] as const;

async function main() {
  const apiKey = process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Set CHATGPT_API_KEY or OPENAI_API_KEY to generate narration.");
  const client = new OpenAI({ apiKey, maxRetries: 2, timeout: 60_000 });
  const catalog = melodyNarrationCatalog();
  const manifestPath = path.resolve("lib/melody-voice-manifest.json");
  const manifest: { version: number; voices: Record<string, string[]> } = { version: 1, voices: { warm: [], story: [] } };
  try { Object.assign(manifest, JSON.parse(await readFile(manifestPath, "utf8"))); } catch { /* First generation. */ }
  const jobs = packs.flatMap(pack => [...catalog].map(([id, input]) => ({ pack, id, input })));
  console.log(`Generating ${catalog.size} narration clips for each of ${packs.length} voices. Existing files are reused.`);
  let cursor = 0, generated = 0, failed = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const directory = path.resolve("public/games/melody/voices", job.pack.id);
      const filename = path.join(directory, `${job.id}.mp3`);
      try {
        await mkdir(directory, { recursive: true });
        if (!(await stat(filename).catch(() => null))?.size) {
          const response = await client.audio.speech.create({
            model: process.env.MELODY_TTS_MODEL ?? "gpt-4o-mini-tts",
            voice: job.pack.voice, input: job.input, response_format: "mp3",
            instructions: `${job.pack.direction} Speak naturally and clearly for preschool children. Unhurried, expressive, no baby talk. Read exactly the supplied words. No added words or sound effects.`,
          });
          const content = Buffer.from(await response.arrayBuffer());
          if (content.length < 500 || !response.headers.get("content-type")?.startsWith("audio/")) throw new Error("Invalid audio response");
          await writeFile(filename, content);
        }
        if (!manifest.voices[job.pack.id].includes(job.id)) manifest.voices[job.pack.id].push(job.id);
        generated++;
        if (generated % 25 === 0) console.log(`${generated}/${jobs.length} clips ready`);
      } catch (error) {
        failed++;
        const code = typeof error === "object" && error && "status" in error ? (error as { status: unknown }).status : "connection or audio error";
        console.error(`Could not generate ${job.pack.id}/${job.id}: ${code}`);
        if (failed >= 5) { cursor = jobs.length; }
      }
    }
  }));
  for (const pack of packs) manifest.voices[pack.id].sort();
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${generated} clips ready; ${failed} failed. Manifest saved.`);
  if (failed) process.exitCode = 1;
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Voice generation failed"); process.exitCode = 1; });
