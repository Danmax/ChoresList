import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const source = join(process.cwd(), ".next", "static");
const target = join(process.cwd(), "public", "next-assets", "_next", "static");

if (!existsSync(source)) {
  throw new Error(`Missing Next static output at ${source}`);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

console.log(`Copied Next static assets to ${target}`);
